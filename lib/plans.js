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

// Display pricing per band. PH gets native peso pricing (charged USD-equivalent — Option B).
export function pricesFor(cc) {
  const c = (cc || "US").toUpperCase();
  const band = bandForCountry(c);
  if (c === "PH") {
    return {
      band, country: c, currency: "PHP",
      pro: "₱300", proSuffix: "/month",
      pass: "₱600", passSuffix: "one-time · 90 days",
      career: "₱900", note: "Prices shown in pesos · billed in USD equivalent",
    };
  }
  if (band === "C") {
    return {
      band, country: c, currency: "USD",
      pro: "$5", proSuffix: "/month",
      pass: "$10", passSuffix: "one-time · 90 days",
      career: "$15", note: "Regional pricing applied for your country",
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
