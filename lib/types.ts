// lib/types.ts

export type UserDoc = {
  uid: string;

  // profile
  name?: string;
  dob?: string;
  gender?: string;
  city?: string;
  lookingFor?: string;
  bio?: string;
  photos?: string[];

  // moderation
  isBanned?: boolean;
  isAdmin?: boolean;

  // wallet
  coinsA?: number;                 // consumable coins
  coinBUntil?: any;                // timestamp (premium entitlement)

  // daily limits
  dailyLikeCount?: number;
  lastLikeReset?: any;
  dailyDateCount?: number;
  lastReset?: any;

  // discover
  viewedToday?: string[];
  lastDiscoverReset?: any;
};
