import type { AuthSession } from "@/core/api/types";

const ACCESS_TOKEN_KEY = "rankup.accessToken";
const REFRESH_TOKEN_KEY = "rankup.refreshToken";
const USER_KEY = "rankup.user";

/** Restore session from localStorage; clears corrupt entries. */
export function readStoredSession(): AuthSession | null {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);

  if (!accessToken || !refreshToken || !userRaw) {
    return null;
  }

  try {
    const user = JSON.parse(userRaw) as AuthSession["user"];
    return { accessToken, refreshToken, user };
  } catch {
    clearStoredSession();
    return null;
  }
}

/** Persist full session (tokens + user snapshot). */
export function saveStoredSession(session: AuthSession): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

/** Update tokens after refresh without rewriting the user object. */
export function updateStoredTokens(
  accessToken: string,
  refreshToken: string,
): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/** Read refresh token alone (used when access token expired). */
export function readStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Remove all auth keys from localStorage. */
export function clearStoredSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
