"use client";

import PageShell from "@/components/PageShell";
import {
  listDiscoverUsers,
  likeUser,
  sendDateRequest,
  getUserDoc,
  markViewed,
} from "@/lib/firestore";
import type { UserDoc } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

function formatDistanceKm() {
  const n = Math.random() * 8 + 0.5;
  return `${n.toFixed(1)} km away`;
}

function calcAge(dob?: string) {
  if (!dob) return null;
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

export default function DiscoverPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserDoc | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.replace("/login");
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return router.replace("/profile-setup");
      setMe({ uid: user.uid, ...(snap.data() as UserDoc) });
    });
    return () => unsub();
  }, [router]);

  if (!me) return null;

  return (
    <PageShell title="Discover">
      <DiscoverInner me={me} />
    </PageShell>
  );
}

function DiscoverInner({ me }: { me: UserDoc }) {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [idx, setIdx] = useState(0);
  const [history, setHistory] = useState<UserDoc[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await listDiscoverUsers({
        currentUid: me.uid,
        city: me.city,
        lookingFor: me.lookingFor,
      });

      const shuffled = [...u];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      setUsers(shuffled);
      setIdx(0);
      setHistory([]);
    })();
  }, [me.uid, me.city, me.lookingFor]);

  const current = users[idx];
  const age = useMemo(() => calcAge(current?.dob), [current?.dob]);

  async function next() {
    if (!current) return;
    await markViewed(me.uid, current.uid);
    setHistory((h) => [...h, current]);
    setIdx((i) => i + 1);
  }

  function goBack() {
    if (!me.isPremium) return;
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setUsers((u) => [prev, ...u.slice(idx)]);
    setIdx(0);
  }

  async function like() {
    if (!current) return;
    setBusy(true);
    try {
      await likeUser(me.uid, current.uid);
      await next();
    } finally {
      setBusy(false);
    }
  }

  async function askDate() {
    if (!current) return;
    const date =
      prompt("Date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10)) || "";
    const time = prompt("Time (HH:mm)", "19:00") || "";
    const place = prompt("Place", "Sky Lounge") || "";
    if (!date || !time || !place) return;

    setBusy(true);
    try {
      const freshMe = await getUserDoc(me.uid);
      if (!freshMe) return;

      await sendDateRequest({
        fromUser: freshMe,
        toUserId: current.uid,
        date,
        time,
        place,
      });

      await next();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!current ? (
        <div className="app-card rounded-2xl p-6 text-center text-sm app-muted">
          No more profiles today. Come back tomorrow 🙂
        </div>
      ) : (
        <div className="app-card rounded-2xl p-4">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl app-card">
            <img
              src={current.photos?.[0]}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="mt-4">
            <div className="text-xl font-semibold app-text">
              {current.name}
              {age !== null && `, ${age}`}
            </div>

            <div className="mt-1 text-sm app-muted">{formatDistanceKm()}</div>

            <div className="mt-3 text-sm app-text">{current.bio}</div>

            <Link
              href={`/u/${current.uid}`}
              className="mt-4 block rounded-xl app-card px-4 py-2 text-center text-sm font-semibold app-text"
            >
              View Profile
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3">
            <button
              disabled={!me.isPremium || busy}
              onClick={goBack}
              className="rounded-xl app-card px-4 py-3 font-semibold app-text disabled:opacity-40"
            >
              ↩️
            </button>

            <button
              disabled={busy}
              onClick={next}
              className="rounded-xl app-card px-4 py-3 font-semibold app-text"
            >
              ❌
            </button>

            <button
              disabled={busy}
              onClick={like}
              className="rounded-xl app-primary px-4 py-3 font-semibold"
            >
              ❤️
            </button>

            <button
              disabled={busy}
              onClick={askDate}
              className="rounded-xl app-card px-4 py-3 font-semibold app-text"
            >
              📅
            </button>
          </div>
        </div>
      )}
    </>
  );
}
