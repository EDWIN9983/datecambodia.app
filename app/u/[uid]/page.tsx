"use client";

import PageShell from "@/components/PageShell";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";

type PublicUser = {
  uid: string;
  name: string;
  dob: string;
  gender: string;
  lookingFor: string;
  city: string;
  bio: string;
  interests: string[];
  photos: string[];
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

export default function PublicProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

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

        setUser({ uid, ...data });
      } finally {
        setLoading(false);
      }
    })();
  }, [uid, router]);

  const age = useMemo(
    () => (user?.dob ? calcAge(user.dob) : null),
    [user?.dob]
  );

  if (loading) return null;
  if (!user) return null;

  return (
    <PageShell title="Profile">
      <div className="space-y-4">
        {/* Photos */}
        <div className="rounded-2xl overflow-hidden app-card">
          {user.photos?.[0] ? (
            <img
              src={user.photos[0]}
              className="w-full h-[420px] object-cover"
            />
          ) : (
            <div className="h-[420px] flex items-center justify-center app-muted text-sm">
              No photo
            </div>
          )}
        </div>

        {/* Basic info */}
        <div className="rounded-2xl app-card p-4">
          <div className="text-xl font-semibold app-text">
            {user.name}
            {age !== null && `, ${age}`}
          </div>

          <div className="text-sm app-muted mt-1">
            {user.city} · Looking for {user.lookingFor}
          </div>

          {user.bio && (
            <div className="mt-3 text-sm app-text">
              {user.bio}
            </div>
          )}
        </div>

        {/* Interests */}
        {user.interests?.length > 0 && (
          <div className="rounded-2xl app-card p-4">
            <div className="text-sm font-semibold mb-2 app-text">Interests</div>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((i) => (
                <span
                  key={i}
                  className="rounded-full border px-3 py-1 text-xs app-text"
                >
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
