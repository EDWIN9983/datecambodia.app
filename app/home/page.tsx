"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import PageShell from "@/components/PageShell";

// =========================
// TYPES
// =========================
type UserProfile = {
  uid: string;
  name?: string;
  photos?: string[];
  city?: string;
  isAdmin?: boolean;
  isPremium?: boolean;
  isBanned?: boolean;
  dailyDateCount?: number;
};

// =========================
// HELPERS
// =========================
function todayKeyLocal() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// =========================
// PAGE
// =========================
export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [incomingCount, setIncomingCount] = useState(0);
  const [outgoingCount, setOutgoingCount] = useState(0);

  // =========================
  // LOAD PROFILE
  // =========================
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists() || !snap.data()?.name) {
          router.replace("/profile-setup");
          return;
        }

        const data = snap.data() as UserProfile;

        if (data.isBanned) {
          router.replace("/login");
          return;
        }

        setProfile({ ...data, uid: user.uid });
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [user, loading, router]);

  // =========================
  // LOAD DATE COUNTS
  // =========================
  useEffect(() => {
    if (!profile?.uid) return;

    (async () => {
      const incomingQ = query(
        collection(db, "dateRequests"),
        where("toUser", "==", profile.uid),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      const outgoingQ = query(
        collection(db, "dateRequests"),
        where("fromUser", "==", profile.uid),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      const [inSnap, outSnap] = await Promise.all([
        getDocs(incomingQ),
        getDocs(outgoingQ),
      ]);

      setIncomingCount(inSnap.size);
      setOutgoingCount(outSnap.size);
    })();
  }, [profile?.uid]);

  const dailyLeft = useMemo(() => {
    if (profile?.isAdmin) return "Unlimited";
    return Math.max(0, 10 - (profile?.dailyDateCount || 0));
  }, [profile?.dailyDateCount, profile?.isAdmin]);

  if (loading || profileLoading) return null;
  if (!profile) return null;

  const avatar = profile.photos?.[0];

  return (
    <PageShell title="Home">
      <div className="space-y-4">
        {/* Profile Card */}
        <div className="app-card rounded-2xl p-4 flex gap-4 items-center">
          <div className="h-14 w-14 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
            {avatar ? (
              <img
                src={avatar}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs app-muted">Photo</span>
            )}
          </div>

          <div className="flex-1">
            <div className="text-sm app-muted">Hi,</div>
            <div className="text-xl font-semibold app-text">
              {profile.name} 👋
            </div>
            <div className="text-xs app-muted">
              {profile.city || "Cambodia"}
              {profile.isPremium ? " · Premium" : ""}
              {profile.isAdmin ? " · Admin" : ""}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="app-card rounded-xl p-3">
            <div className="text-xs app-muted">
              Date requests left today
            </div>
            <div className="text-lg font-semibold app-text">
              {dailyLeft}
            </div>
          </div>

          <div className="app-card rounded-xl p-3">
            <div className="text-xs app-muted">Today</div>
            <div className="text-lg font-semibold app-text">
              {todayKeyLocal()}
            </div>
          </div>
        </div>

        {/* Actions */}
        <Link
          href="/discover"
          className="block w-full rounded-xl app-primary px-4 py-3 text-center font-semibold"
        >
          Start Matching
        </Link>

        <Link
          href="/pubs"
          className="block w-full rounded-xl app-card px-4 py-3 text-center font-semibold app-text"
        >
          Browse Events
        </Link>

        {/* Date Summary */}
        <div className="app-card rounded-2xl p-4">
          <div className="text-sm font-semibold mb-2 app-text">
            Date Requests
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="app-card rounded-xl p-3">
              <div className="text-xs app-muted">Incoming</div>
              <div className="text-lg font-semibold app-text">
                {incomingCount}
              </div>
            </div>
            <div className="app-card rounded-xl p-3">
              <div className="text-xs app-muted">Outgoing</div>
              <div className="text-lg font-semibold app-text">
                {outgoingCount}
              </div>
            </div>
          </div>
        </div>

        {profile.isAdmin && (
          <Link
            href="/admin"
            className="block w-full rounded-xl app-card px-4 py-3 text-center font-semibold app-text"
          >
            Admin Panel
          </Link>
        )}
      </div>
    </PageShell>
  );
}
