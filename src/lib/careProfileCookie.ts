/**
 * Cookie fallback for care profile when SQLite is unavailable (e.g. Vercel serverless).
 */

import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import type { CareRecipient } from "./repo";

const COOKIE_NAME = "luma_care_profile";

function emptyRecipient(): CareRecipient {
  return {
    id: randomUUID(),
    name: "",
    stage: null,
    caregiver_relationship: null,
    age: null,
    living_situation: null,
    onboarding_completed_at: null,
    onboarding_skipped_at: null,
    created_at: new Date().toISOString(),
  };
}

export function readCareProfileCookie(): CareRecipient | null {
  try {
    const raw = cookies().get(COOKIE_NAME)?.value;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareRecipient;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCareProfileCookie(recipient: CareRecipient): void {
  cookies().set(COOKIE_NAME, JSON.stringify(recipient), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

export function getOrCreateDefaultRecipientFromCookie(): CareRecipient {
  return readCareProfileCookie() ?? emptyRecipient();
}
