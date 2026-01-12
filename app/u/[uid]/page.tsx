"use client";

import PageShell from "@/components/PageShell";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { blockUser } from "@/lib/firestore";

type PublicUser = {
  uid: string;
  name: string;
  dob: string;
  gender?: "male" | "female" | "other";
  lookingFor: string;
  city: string;
  bio: string;
  interests: string[];
  photos: string[];
  nationality?: string;
  publicId?: string;
  isPremium?: boolean;
  likesCount?: number;
  lastActive?: any;
  isBanned?: boolean;
};

function calcAge(dob: string) {
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

function formatLastSeen(ts: any) {
  if (!ts?.toDate) return null;
  const diff = Date.now() - ts.toDate().getTime();
  if (diff < 2 * 60 * 1000) return "Online";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last seen ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `Last seen ${days}d ago`;
}

function subtitleFromInterests(interests?: string[]) {
  const list = interests || [];
  const hasShortStay = list.includes("Short stay") || list.includes("Just visiting");
  if (hasShortStay) return "Short stay · Open to meet";
  return "Here for fun & good vibes";
}

export default function PublicProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (u) setMyUid(u.uid);
    });
  }, []);

  useEffect(() => {
    if (!uid) return;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (!snap.exists()) {
          router.replace("/discover");
          return;
        }

        const data = snap.data() as PublicUser;
        if (data.isBanned) {
          router.replace("/discover");
          return;
        }

        setUser(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid, router]);

  const age = useMemo(() => (user?.dob ? calcAge(user.dob) : null), [user?.dob]);

  if (loading || !user) return null;

  const likes = likesBadge(user.likesCount || 0);
  const subtitle = subtitleFromInterests(user.interests);
  const photos = (user.photos || []).slice(0, 5);

  return (
    <PageShell title="Profile">
      <div className="space-y-4">
        {/* HERO PHOTO */}
        <div className="relative rounded-2xl overflow-hidden app-card">
          {photos.length > 0 ? (
            photos.length > 1 ? (
              <>
                <img
                  src={photos[slide]}
                  className="w-full h-[420px] object-cover"
                  onClick={() => setSlide((s) => (s + 1) % photos.length)}
                />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      className={`h-2.5 w-2.5 rounded-full ${
                        i === slide ? "bg-white" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <img src={photos[0]} className="w-full h-[420px] object-cover" />
            )
          ) : (
            <div className="h-[420px] flex items-center justify-center app-muted text-sm">
              No photo
            </div>
          )}
        </div>

        {/* PROFILE INFO */}
        <div className="rounded-2xl app-card p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm px-2 py-0.5 rounded-full app-card">
                {genderBadge(user.gender)}
              </span>

              <div className="text-2xl font-bold app-text">
                {user.name}
                {age !== null && `, ${age}`}
              </div>

              <span className={`text-sm font-semibold ${likes.accent}`}>
                {likes.label}
              </span>

              {user.publicId && (
                <span className="text-xs px-2 py-1 rounded-full app-card app-text">
                  {user.publicId}
                </span>
              )}
            </div>

            <div className="text-sm app-muted mt-1">{subtitle}</div>

            <div className="text-sm app-muted mt-1">
              {countryFlag(user.nationality)} {user.nationality} · {user.city}
            </div>
          </div>

          <div className="text-xs app-muted flex flex-wrap gap-x-3 gap-y-1">
            {user.lastActive && <span>{formatLastSeen(user.lastActive)}</span>}
            <span>Looking for {user.lookingFor}</span>
          </div>

          {user.bio && <div className="text-sm app-text">{user.bio}</div>}

          {myUid && myUid !== user.uid && (
            <button
              onClick={async () => {
                if (!confirm("Block this user?")) return;
                await blockUser(myUid, user.uid);
                router.replace("/discover");
              }}
              className="w-full mt-3 rounded-xl border border-red-400 text-red-500 py-2 text-sm font-semibold"
            >
              Block user
            </button>
          )}
        </div>

        {/* INTERESTS */}
        {user.interests?.length > 0 && (
          <div className="rounded-2xl app-card p-4">
            <div className="text-sm font-semibold mb-2 app-text">
              What I’m into right now
            </div>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((i) => (
                <span key={i} className="rounded-full border px-3 py-1 text-xs app-text">
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
