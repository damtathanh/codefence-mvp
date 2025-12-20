/**
 * Checks if a user is an admin based on their email domain.
 * Admin users have emails ending with "@codfence.com"
 *
 * @param user - The user object from Supabase Auth
 * @returns true if user is admin, false otherwise
 */
export function isAdminByEmail(user) {
    if (!user || !user.email) {
        return false;
    }
    return user.email.toLowerCase().endsWith('@codfence.com');
}
