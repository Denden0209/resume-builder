import { getStripe, stripeConfigured, priceIdFor } from "@/lib/stripe";
import { getUser } from "@/lib/supabase/server";
import { bandForCountry } from "@/lib/plans";

export const runtime = "nodejs";

// POST { product: "monthly" | "pass" } → Stripe Checkout URL
export async function POST(req) {
  try {
    if (!stripeConfigured()) {
      return Response.json({ error: "Payments aren't live yet." }, { status: 503 });
    }
    const user = await getUser();
    if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

    const { product } = await req.json();
    const p = product === "pass" ? "pass" : "monthly";
    const band = bandForCountry(req.headers.get("x-vercel-ip-country"));
    const price = priceIdFor(p, band);
    if (!price) return Response.json({ error: "Pricing not configured for this product." }, { status: 503 });

    const origin = new URL(req.url).origin;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: p === "monthly" ? "subscription" : "payment",
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email || undefined,
      metadata: { userId: user.id, product: p },
      ...(p === "monthly" ? { subscription_data: { metadata: { userId: user.id } } } : {}),
      success_url: `${origin}/dashboard?upgraded=1`,
      cancel_url: `${origin}/pricing`,
      allow_promotion_codes: true,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    console.error("checkout error:", e);
    return Response.json({ error: "Couldn't start checkout — try again." }, { status: 500 });
  }
}
