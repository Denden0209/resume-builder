// Cloudflare Turnstile verification. No-ops when not configured, so the app
// runs fine before you add the keys.

export function turnstileConfigured() {
  return !!(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verify a Turnstile token. Returns true when configured+valid, or when not configured.
 */
export async function verifyTurnstile(token, ip) {
  if (!turnstileConfigured()) return true; // feature off
  if (!token) return false;
  try {
    const body = new URLSearchParams();
    body.append("secret", process.env.TURNSTILE_SECRET_KEY);
    body.append("response", token);
    if (ip && ip !== "unknown") body.append("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const json = await res.json();
    return !!json.success;
  } catch (e) {
    console.error("turnstile verify error:", e);
    return false; // fail closed on the expensive endpoint
  }
}
