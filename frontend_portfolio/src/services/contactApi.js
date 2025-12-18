//
// Simple client for the Django contact-service
//
// PUBLIC_INTERFACE
export async function sendContactMessage({ name, email, subject, message }) {
  /**
   * Sends a contact form submission to the Django API.
   * Uses REACT_APP_CONTACT_API_URL as base URL.
   * Returns an object { ok: boolean, data?: any, error?: string }
   */
  const base = process.env.REACT_APP_CONTACT_API_URL;
  if (!base) {
    return {
      ok: false,
      error:
        "REACT_APP_CONTACT_API_URL is not set. Please configure it in your .env file.",
    };
  }

  const url = `${base.replace(/\/+$/, '')}/api/contact/`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Django endpoint expects: { name, email, subject, message }
      body: JSON.stringify({ name, email, subject, message }),
      credentials: "omit",
    });

    const contentType = resp.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
      data = await resp.json().catch(() => null);
    } else {
      const text = await resp.text().catch(() => "");
      data = text || null;
    }

    if (!resp.ok) {
      const msg =
        (data && (data.error || data.detail || data.message)) ||
        `Request failed with status ${resp.status}`;
      return { ok: false, error: String(msg), data };
    }

    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err?.message || "Network error" };
  }
}
