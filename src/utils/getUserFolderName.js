const SLUG_REGEX = /[^a-z0-9]+/g;
const sanitizeId = (id) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "anon";
const getRandomId = () => typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
const slugify = (value) => value
    .toLowerCase()
    .trim()
    .replace(SLUG_REGEX, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
/**
 * Build user folder name prioritizing company_name, then full_name, then id.
 * Format: {slugified-company-or-name}--{sanitizedId}
 */
export function getUserFolderName(profile) {
    if (!profile || !profile.id) {
        return `user-${getRandomId().slice(0, 8)}`;
    }
    const idPart = sanitizeId(profile.id);
    const source = (profile.company_name && profile.company_name.trim()) ||
        (profile.full_name && profile.full_name.trim());
    if (!source) {
        return `user-${idPart}`;
    }
    return `${slugify(source)}--${idPart}`;
}
export default getUserFolderName;
