/**
 * Full page load after signing in or out. The client router caches pages and
 * redirects per session (e.g. "/checkout → /sign-in" while signed out), so a
 * soft navigation could replay the wrong one or show a previous user's data.
 */
export function navigateAfterAuth(path: string) {
  window.location.assign(path);
}
