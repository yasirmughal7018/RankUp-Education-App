function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5255/api";

const apiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl);

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

if (
  isProduction &&
  /localhost|127\.0\.0\.1/i.test(apiBaseUrl)
) {
  console.warn(
    "[RankUp] VITE_API_BASE_URL points to localhost in a production build. Set a public HTTPS API URL before deploying.",
  );
}

/** Normalized runtime config from Vite env vars. */
export const environment = {
  apiBaseUrl,
  appName: (import.meta.env.VITE_APP_NAME ?? "RankUp Education").trim(),
  isDevelopment,
  isProduction,
} as const;
