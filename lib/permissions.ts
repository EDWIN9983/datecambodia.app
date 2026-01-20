import { Timestamp } from "firebase/firestore";
import type { UserDoc } from "@/lib/types";

/* =========================
   PREMIUM CHECK (FINAL)
========================= */

export function isPremiumActive(user: UserDoc | null): boolean {
  if (!user?.coinBUntil) return false;

  const until = user.coinBUntil;

  // Firestore Timestamp
  if (until instanceof Timestamp) {
    return until.toDate().getTime() > Date.now();
  }

  // Serialized Timestamp (Next.js hydration edge case)
  if (typeof until?.toDate === "function") {
    return until.toDate().getTime() > Date.now();
  }

  return false;
}

/* =========================
   DAILY LIMITS
========================= */

export function canSendLike(user: UserDoc | null): boolean {
  if (!user) return false;

  // Premium bypasses limits
  if (isPremiumActive(user)) return true;

  const used = user.dailyLikeCount || 0;
  const limit = 10;

  return used < limit;
}

export function canSendDate(user: UserDoc | null): boolean {
  if (!user) return false;

  // Premium bypasses limits
  if (isPremiumActive(user)) return true;

  const used = user.dailyDateCount || 0;
  const limit = 10;

  return used < limit;
}

/* =========================
   FEATURE GATES
========================= */

export function canViewProfile(user: UserDoc | null): boolean {
  if (!user) return false;

  // Premium always allowed
  if (isPremiumActive(user)) return true;

  // Free users limited by pulses (coinA)
  const pulses = user.coinsA || 0;
  return pulses > 0;
}

export function canSendMessage(user: UserDoc | null): boolean {
  if (!user) return false;

  // Premium always allowed
  if (isPremiumActive(user)) return true;

  const pulses = user.coinsA || 0;
  return pulses > 0;
}

export function canSeeVisitors(user: UserDoc | null): boolean {
  if (!user) return false;

  // Premium only feature
  return isPremiumActive(user);
}
