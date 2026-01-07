// lib/permissions.ts

import { UserDoc } from "@/lib/types";

function now() {
  return new Date();
}

export function hasCoinB(user?: UserDoc | null): boolean {
  if (!user) return false;

  const until = user.coinBUntil;
  if (!until) return false;

  if (until.toDate) {
    return until.toDate() > now();
  }

  return new Date(until) > now();
}

// ---------- FEATURE GATES ----------

export function canViewProfile(user?: UserDoc | null): boolean {
  return hasCoinB(user);
}

export function canGoBack(user?: UserDoc | null): boolean {
  return hasCoinB(user);
}

export function canChatWithoutDate(user?: UserDoc | null): boolean {
  return hasCoinB(user);
}

export function canSendExtraLike(user?: UserDoc | null): boolean {
  return (user?.coinsA ?? 0) > 0;
}

export function canSendExtraDate(user?: UserDoc | null): boolean {
  return (user?.coinsA ?? 0) > 0;
}
