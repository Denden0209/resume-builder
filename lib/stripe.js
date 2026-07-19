import Stripe from "stripe";

export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe() {
  if (!stripeConfigured()) throw new Error("Stripe not configured");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Price IDs per band; band-specific env vars fall back to band A.
export function priceIdFor(product, band) {
  const suffix = band === "C" ? "_C" : band === "B" ? "_B" : "";
  if (product === "monthly") {
    return process.env[`STRIPE_PRICE_MONTHLY${suffix}`] || process.env.STRIPE_PRICE_MONTHLY;
  }
  return process.env[`STRIPE_PRICE_PASS${suffix}`] || process.env.STRIPE_PRICE_PASS;
}
