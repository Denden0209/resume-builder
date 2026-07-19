import { getStripe, stripeConfigured } from "@/lib/stripe";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

// Stripe is the ONLY writer of paid plan records.
export async function POST(req) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Not configured", { status: 503 });
  }
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("webhook signature failed:", e.message);
    return new Response("Bad signature", { status: 400 });
  }

  const redis = getRedis();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const product = session.metadata?.product;
      if (userId) {
        if (product === "pass") {
          await redis.set(`plan:${userId}`, {
            tier: "pro",
            expiresAt: Date.now() + 90 * 86400000,
            source: "stripe-pass",
            stripeCustomerId: session.customer || null,
          });
        } else {
          await redis.set(`plan:${userId}`, {
            tier: "pro",
            expiresAt: null, // active until subscription ends
            source: "stripe-subscription",
            stripeCustomerId: session.customer || null,
            stripeSubscriptionId: session.subscription || null,
          });
        }
        if (session.customer) {
          await redis.set(`stripe:cust:${session.customer}`, userId);
        }
        await redis.incr("stats:paid");
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const userId = sub.metadata?.userId || (await redis.get(`stripe:cust:${sub.customer}`));
      if (userId) {
        const rec = await redis.get(`plan:${userId}`);
        // Only clear subscription-sourced plans (don't clobber an active pass/manual grant)
        if (rec?.source === "stripe-subscription") {
          await redis.del(`plan:${userId}`);
        }
      }
    }
  } catch (e) {
    console.error("webhook handling error:", e);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
