// Pricing bands, tier limits, and geo detection — the single source of truth.

export const TIER_LIMITS = {
  free: { pages: 1, parsesPerMonth: 2, badge: true },
  pro: { pages: 5, parsesPerMonth: 20, badge: false },
};

const BAND_B = new Set(["MY", "TH", "MX", "BR", "AR", "CL", "CO", "PE", "PL", "RO", "HU", "BG", "TR", "ZA", "CN"]);
const BAND_C = new Set(["PH", "IN", "VN", "ID", "PK", "BD", "NG", "KE", "EG", "LK", "NP", "KH", "MM"]);

export function bandForCountry(cc) {
  const c = (cc || "US").toUpperCase();
  if (BAND_C.has(c)) return "C";
  if (BAND_B.has(c)) return "B";
  return "A";
}

// Display pricing per band. PH gets native peso pricing.
export function pricesFor(cc) {
  const c = (cc || "US").toUpperCase();
  const band = bandForCountry(c);
  if (c === "PH") {
    return {
      band, country: c, currency: "PHP",
      pro: "₱149", proSuffix: "/month",
      pass: "₱349", passSuffix: "one-time · 90 days",
      career: "₱499", note: "Pricing shown in Philippine pesos",
    };
  }
  if (band === "C") {
    return {
      band, country: c, currency: "USD",
      pro: "$2.50", proSuffix: "/month",
      pass: "$6", passSuffix: "one-time · 90 days",
      career: "$8", note: "Regional pricing applied for your country",
    };
  }
  if (band === "B") {
    return {
      band, country: c, currency: "USD",
      pro: "$4", proSuffix: "/month",
      pass: "$10", passSuffix: "one-time · 90 days",
      career: "$12", note: "Regional pricing applied for your country",
    };
  }
  return {
    band, country: c, currency: "USD",
    pro: "$8", proSuffix: "/month",
    pass: "$19", passSuffix: "one-time · 90 days",
    career: "$24", note: null,
  };
}
