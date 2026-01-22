"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  doc,
  getDocFromServer,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import PageShell from "@/components/PageShell";

type UserProfile = {
  uid: string;
  name?: string;
  dob?: string;
  gender?: "male" | "female" | "other";
  city?: string;
  bio?: string;
  interests?: string[];
  photos?: string[];
  nationality?: string;
  publicId?: string;
  likesCount?: number;
  isPremium?: boolean;
  coinBUntil?: any;
  isAdmin?: boolean;
  isBanned?: boolean;
  dailyDateCount?: number;
  dailyLikeCount?: number;
  lastReset?: any;
};

function calcAge(dob?: string) {
  if (!dob) return null;
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

function countryFlag(nationality?: string) {
  if (!nationality) return "🌍";
  const map: Record<string, string> = {
    Cambodian: "🇰🇭",
    Thai: "🇹🇭",
    Vietnamese: "🇻🇳",
    Chinese: "🇨🇳",
    Korean: "🇰🇷",
    Japanese: "🇯🇵",
    Indian: "🇮🇳",
    Filipino: "🇵🇭",
    Malaysian: "🇲🇾",
    Singaporean: "🇸🇬",
    Indonesian: "🇮🇩",
    Australian: "🇦🇺",
    French: "🇫🇷",
    German: "🇩🇪",
    British: "🇬🇧",
    American: "🇺🇸",
    Canadian: "🇨🇦",
  };
  return map[nationality] || "🌍";
}

function genderBadge(g?: string) {
  if (g === "male") return "♂";
  if (g === "female") return "♀";
  return "⚧";
}

function likesBadge(count = 0) {
  if (count >= 100) return { label: "👑 Hot", accent: "text-pink-400" };
  if (count >= 50) return { label: "🔥 Popular", accent: "text-orange-400" };
  return { label: `❤️ ${count}`, accent: "text-red-400" };
}

function subtitleFromInterests(interests?: string[]) {
  const list = interests || [];
  if (list.includes("Short stay") || list.includes("Just visiting")) {
    return "Short stay · Open to meet";
  }
  return "Here for fun & good vibes";
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // 🔧 STORE BOTH LIMITS
  const [defaultDailyDateLimit, setDefaultDailyDateLimit] = useState(10);
  const [premiumDailyDateLimit, setPremiumDailyDateLimit] = useState(50);

  const [defaultDailyLikeLimit, setDefaultDailyLikeLimit] = useState(10);
  const [premiumDailyLikeLimit, setPremiumDailyLikeLimit] = useState(50);

  const premiumActive = useMemo(() => {
    if (!profile?.coinBUntil) return false;
    const until = profile.coinBUntil;
    if (until instanceof Timestamp) {
      return until.toDate().getTime() > Date.now();
    }
    if (typeof until?.toDate === "function") {
      return until.toDate().getTime() > Date.now();
    }
    return false;
  }, [profile?.coinBUntil]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const snap = await getDocFromServer(doc(db, "users", user.uid));
        if (!snap.exists()) {
          router.replace("/profile-setup");
          return;
        }

        const data = snap.data() as UserProfile;
        if (data.isBanned) {
          router.replace("/login");
          return;
        }

        setProfile({ ...data, uid: user.uid });

        // 🔧 FETCH BOTH DEFAULT + PREMIUM LIMITS
        const adminSnap = await getDocFromServer(
          doc(db, "adminConfig", "defaults")
        );

        if (adminSnap.exists()) {
          const adminData = adminSnap.data();

          setDefaultDailyDateLimit(
            Number(adminData.defaultDailyDateCount) || 10
          );
          setPremiumDailyDateLimit(
            Number(adminData.premiumDailyDateCount) || 50
          );

          setDefaultDailyLikeLimit(
            Number(adminData.defaultDailyLikeCount) || 10
          );
          setPremiumDailyLikeLimit(
            Number(adminData.premiumDailyLikeCount) || 50
          );
        }
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [user, loading, router]);

  if (loading || profileLoading || !profile) return null;

  const avatar = profile.photos?.[0];
  const age = calcAge(profile.dob);
  const likes = likesBadge(profile.likesCount || 0);
  const subtitle = subtitleFromInterests(profile.interests);

  // 🔧 DAILY RESET UI FIX
  const now = new Date();
  const lastResetDate = profile.lastReset?.toDate?.();

  function isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  const effectiveDailyDateCount =
    lastResetDate && isSameDay(lastResetDate, now)
      ? profile.dailyDateCount || 0
      : 0;

  const effectiveDailyLikeCount =
    lastResetDate && isSameDay(lastResetDate, now)
      ? profile.dailyLikeCount || 0
      : 0;

  // 🔧 SPLIT QUOTAS
  const defaultDateUsed = Math.min(
    effectiveDailyDateCount,
    defaultDailyDateLimit
  );

  const premiumDateUsed = Math.max(
    0,
    effectiveDailyDateCount - defaultDailyDateLimit
  );

  const defaultLikeUsed = Math.min(
    effectiveDailyLikeCount,
    defaultDailyLikeLimit
  );

  const premiumLikeUsed = Math.max(
    0,
    effectiveDailyLikeCount - defaultDailyLikeLimit
  );

  return (
    <PageShell title="My Profile">
      <div className="app-card rounded-2xl overflow-hidden">
        <div className="relative h-[320px] bg-gray-200">
          {avatar ? (
            <img src={avatar} className="w-full h-full object-cover" />
          ) : (
            <div className="h-full flex items-center justify-center app-muted">
              No photo
            </div>
          )}

          <Link
            href="/profile"
            className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2"
          >
            ✏️
          </Link>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm px-2 py-0.5 rounded-full app-card">
                {genderBadge(profile.gender)}
              </span>

              <div
                className={`text-2xl font-bold ${
                  premiumActive ? "text-yellow-300" : "app-text"
                }`}
              >
                {profile.name}
                {age !== null && `, ${age}`}
              </div>

              {premiumActive && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  VIP
                </span>
              )}

              <span className={`text-sm font-semibold ${likes.accent}`}>
                {likes.label}
              </span>

              {profile.publicId && (
                <span className="text-xs px-2 py-1 rounded-full app-card app-text">
                  {profile.publicId}
                </span>
              )}
            </div>

            <div className="text-sm app-muted mt-1">{subtitle}</div>

            <div className="text-sm app-muted mt-1">
              {countryFlag(profile.nationality)} {profile.nationality} ·{" "}
              {profile.city}
            </div>
          </div>

          {profile.bio && (
            <div>
              <div className="text-sm font-semibold app-text mb-1">About</div>
              <div className="text-sm app-text">{profile.bio}</div>
            </div>
          )}

          {profile.interests?.length ? (
            <div>
              <div className="text-sm font-semibold app-text mb-2">
                What I’m into right now
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((i) => (
                  <span
                    key={i}
                    className="rounded-full border px-3 py-1 text-xs app-text"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* 🔧 V2 UI LIMITS */}
          <div className="text-sm app-muted space-y-2">
            <div className="font-semibold app-text">
              Date requests today
            </div>

            <div>
              Default:{" "}
              <span className="app-text">
                {defaultDateUsed} / {defaultDailyDateLimit}
              </span>
            </div>

            {premiumActive ? (
              <div>
                Premium bonus:{" "}
                <span className="app-text">
                  {premiumDateUsed} /{" "}
                  {Math.max(
                    0,
                    premiumDailyDateLimit -
                      defaultDailyDateLimit
                  )}
                </span>
              </div>
            ) : (
              <div className="text-xs text-pink-600">
                💖 Upgrade to send more date requests
              </div>
            )}

            <div className="pt-2 font-semibold app-text">
              Likes today
            </div>

            <div>
              Default:{" "}
              <span className="app-text">
                {defaultLikeUsed} / {defaultDailyLikeLimit}
              </span>
            </div>

            {premiumActive ? (
              <div>
                Premium bonus:{" "}
                <span className="app-text">
                  {premiumLikeUsed} /{" "}
                  {Math.max(
                    0,
                    premiumDailyLikeLimit -
                      defaultDailyLikeLimit
                  )}
                </span>
              </div>
            ) : (
              <div className="text-xs text-pink-600">
                🔓 Unlock premium to get extra likes
              </div>
            )}
          </div>

          <Link
            href="/profile"
            className="block w-full rounded-xl app-primary px-4 py-3 text-center font-semibold"
          >
            Edit Profile
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
