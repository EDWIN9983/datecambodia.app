// lib/types.ts
import { Timestamp } from "firebase/firestore";

export type UserDoc = {
  uid: string;
  name?: string;
  bio?: string;
  dob?: string;
  gender?: string;
  photos?: string[];

  publicId?: string;

  isPremium?: boolean;
  isAdmin?: boolean;
  isBanned?: boolean;

  coinsA?: number;
  coinBUntil?: any;
  dailyLikeCount?: number;
  lastLikeReset?: any;
  dailyDateCount?: number;
  lastReset?: any;
  viewedToday?: string[];
  lastDiscoverReset?: any;
};

export type DateRequestDoc = {
  fromUser: string;
  toUser: string;

  status: "pending" | "accepted" | "declined" | "expired";

  createdAt: Timestamp;
  respondedAt?: Timestamp;

  seenBySender?: boolean;
  seenByReceiver?: boolean;

  date?: string;
  time?: string;
  place?: string;
  placeId?: string;
};
