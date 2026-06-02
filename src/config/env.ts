import nereusLogoLightPng from "../assets/nereus-logo-light.png";

function normalizeApiBaseUrl(raw: string | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  return t.replace(/\/+$/, "");
}

const fromEnv = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

let apiBaseUrl: string;
if (fromEnv) {
  apiBaseUrl = fromEnv;
} else if (import.meta.env.DEV) {
  apiBaseUrl = "https://nereus-api.vercel.app";//"http://localhost:4000";
} else {
  apiBaseUrl = "https://nereus-api.vercel.app";
}

/** Base origin of the Nereus API — from `VITE_API_BASE_URL` in `.env`, or `http://localhost:4000` in dev when unset. */
export const API_BASE_URL = apiBaseUrl;

/**
 * Public HTTP origin for the file-store bucket (no trailing slash), e.g.
 * `https://nereus-local-fs.s3.eu-west-2.amazonaws.com`.
 * From `VITE_FS_BUCKET_PUBLIC_URL`. When set, objects are addressable as `${base}/${key}`.
 */
export const FS_BUCKET_PUBLIC_URL: string | null = normalizeApiBaseUrl(
  import.meta.env.VITE_FS_BUCKET_PUBLIC_URL
);

/** Build a browser URL for an object key when the bucket is served at `FS_BUCKET_PUBLIC_URL`. */
export function urlForPublicFsObject(objectKey: string): string | null {
  if (!FS_BUCKET_PUBLIC_URL || !objectKey?.trim()) return null;
  const path = objectKey
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${FS_BUCKET_PUBLIC_URL}/${path}`;
}

/** Admin panel logo (`src/assets/nereus-logo-light.png`, bundled for any host). */
export const NEREUS_LOGO_WORDMARK_URL = nereusLogoLightPng;

/** Same asset in the sidebar (compact layout via `object-contain`). */
export const NEREUS_LOGO_MARK_URL = nereusLogoLightPng;

/** @deprecated Use NEREUS_LOGO_WORDMARK_URL or NEREUS_LOGO_MARK_URL */
export const NEREUS_LOGO_URL = NEREUS_LOGO_WORDMARK_URL;
