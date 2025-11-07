/**
 * Convert Supabase hash-based redirects (#access_token=...) into proper query params.
 * Supports: email verification, password recovery, magic link, invite, etc.
 */
export const convertHashToQueryRedirect = (): boolean => {
  const hash = window.location.hash;

  // Only process if URL contains Supabase tokens
  if (hash && hash.includes("access_token")) {
    const hashParams = new URLSearchParams(hash.substring(1));
    const type = hashParams.get("type");

    // Build query string
    const queryString = hash.substring(1);

    // 🔍 Determine destination route
    let destination = "/verify-email"; // default fallback

    switch (type) {
      case "recovery":
        destination = "/reset-password";
        break;
      case "signup":
      case "invite":
        destination = "/verify-email";
        break;
      case "magiclink":
      case "email_change":
        destination = "/verify-email";
        break;
      default:
        destination = "/"; // fallback if unknown
        break;
    }

    // 🚀 Perform redirect (replace hash with query params)
    const newUrl = `${destination}?${queryString}`;
    window.location.replace(newUrl);
    return true;
  }

  return false;
};
