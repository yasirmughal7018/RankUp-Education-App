import { environment } from "@/app/environment";

/** Resolve API-relative avatar paths (e.g. /uploads/avatars/…) to absolute URLs. */
export function resolvePublicUrl(path?: string | null): string | null {
  if (!path?.trim()) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const origin = environment.apiBaseUrl.replace(/\/api\/?$/i, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
