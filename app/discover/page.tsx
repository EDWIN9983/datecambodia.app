"use client";

import PageShell from "@/components/PageShell";
import {
  listDiscoverUsers,
  likeUser,
  sendDateRequest,
  getUserDoc,
  markViewed,
  getBlockedUserIds,
} from "@/lib/firestore";
import type { UserDoc } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

function formatDistanceKm(uid?: string) {
  if (!uid) return "—";
  let h = 0;
  for (let i = 0; i < uid.length; i++) {
    h = (h << 5) - h + uid.charCodeAt(i);
    h |= 0;
  }
  const n = (Math.abs(h) % 80) / 10 + 0.5;
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

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function nowTimeHHMMPlus(minutes = 0) {
  const d = new Date(Date.now() + minutes * 60 * 1000);
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mm = `${d.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function DiscoverPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserDoc | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.replace("/login");
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return router.replace("/profile-setup");
      setMe({ ...(snap.data() as UserDoc), uid: user.uid });
    });
    return () => unsub();
  }, [router]);

  if (!me) return null;

  return (
    <PageShell title="Discover">
      <DiscoverInner me={me} setMe={setMe} />
    </PageShell>
  );
}

function DiscoverInner({
  me,
  setMe,
}: {
  me: UserDoc;
  setMe: (u: UserDoc | null) => void;
}) {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [idx, setIdx] = useState(0);
  const [history, setHistory] = useState<UserDoc[]>([]);
  const [busy, setBusy] = useState(false);

  const [showDate, setShowDate] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);

  const placeInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  const premiumActive = useMemo(() => {
    if (!me.coinBUntil) return false;
    if (!(me.coinBUntil instanceof Timestamp)) return false;
    return me.coinBUntil.toDate().getTime() > Date.now();
  }, [me.coinBUntil]);

  useEffect(() => {
    (async () => {
      const blockedIds = await getBlockedUserIds(me.uid);
      const all = await listDiscoverUsers({ currentUid: me.uid });

      const filteredByGender = all.filter((x) => {
        if (!me.gender || me.gender === "other") return true;
        if (!x.gender) return true;
        if (me.gender === "male") return x.gender === "female";
        if (me.gender === "female") return x.gender === "male";
        return true;
      });

      const u = filteredByGender.filter(
        (x) => !blockedIds.includes(x.uid)
      );

      const shuffled = [...u];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      setUsers(shuffled);
      setIdx(0);
      setHistory([]);
    })();
  }, [me.uid, me.gender]);

  const current = users[idx];
  const age = useMemo(() => calcAge(current?.dob), [current?.dob]);

  useEffect(() => {
    if (!showDate) return;
    if (!placeInputRef.current) return;
    if (!(window as any).google?.maps?.places) return;

    autocompleteRef.current =
      new (window as any).google.maps.places.Autocomplete(
        placeInputRef.current,
        {
          componentRestrictions: { country: "kh" },
          fields: ["place_id", "name", "formatted_address"],
        }
      );

    autocompleteRef.current.addListener("place_changed", () => {
      const p = autocompleteRef.current.getPlace();
      if (!p?.place_id) return;
      setPlace(p.name || "");
      setPlaceId(p.place_id);
    });
  }, [showDate]);

  async function next() {
    if (!current) return;
    setHistory((h) => [...h, current]);
    setIdx((i) => i + 1);
    try {
      await markViewed(me.uid, current.uid);
    } catch {}
  }

  function goBack() {
    if (!premiumActive) return;
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
      const meNow = await getUserDoc(me.uid);
      if (meNow) setMe(meNow);
      await next();
    } catch (e: any) {
      if (e.message === "LIKE_LIMIT_REACHED") {
        alert("Daily like limit reached.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmDate() {
    if (!current || !date || !time || !place || !placeId) return;
    const selected = new Date(`${date} ${time}`);
    if (selected.getTime() <= Date.now()) return;

    setBusy(true);
    try {
      const meNow = await getUserDoc(me.uid);
      if (!meNow) return;

      await sendDateRequest({
        fromUser: meNow,
        toUserId: current.uid,
        date,
        time,
        place,
        placeId,
      });

      setShowDate(false);
      setDate("");
      setTime("");
      setPlace("");
      setPlaceId(null);

      setMe(meNow);
      await next();
    } catch (e: any) {
      if (e.message === "DATE_LIMIT_REACHED") {
        alert("Daily date request limit reached.");
      } else {
        alert("You already sent a date request to this user.");
      }
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

            <div className="mt-1 text-sm app-muted">
              {formatDistanceKm(current.uid)}
            </div>

            <div className="mt-3 text-sm app-text">{current.bio}</div>

            <Link
              href={`/u/${current.uid}`}
              className="mt-4 block rounded-xl app-card px-4 py-2 text-center text-sm font-semibold app-text"
            >
              View Profile
            </Link>
          </div>

          {showDate && (
  <div className="mt-4 space-y-3">
    <input
      type="date"
      value={date}
      onChange={(e) => setDate(e.target.value)}
      className="w-full app-input"
      min={todayISO()}
    />

    <input
      type="time"
      value={time}
      onChange={(e) => setTime(e.target.value)}
      className="w-full app-input"
      min={nowTimeHHMMPlus(30)}
    />

    <input
      ref={placeInputRef}
      value={place}
      onChange={(e) => setPlace(e.target.value)}
      placeholder="Meeting place"
      className="w-full app-input"
    />

    <div className="flex gap-2">
      <button
        disabled={busy}
        onClick={confirmDate}
        className="flex-1 rounded-xl app-primary-glow app-glow-pulse py-2 font-semibold"
      >
        Send Date
      </button>

      <button
        onClick={() => setShowDate(false)}
        className="flex-1 rounded-xl app-card py-2 font-semibold app-text"
      >
        Cancel
      </button>
    </div>
  </div>
)}


          {/* ✅ REPLACED ACTION BAR — UI ONLY */}
          <div className="mt-4 grid grid-cols-4 gap-3">
            <button
              disabled={!premiumActive || busy}
              onClick={goBack}
              className="rounded-xl app-card px-4 py-3 font-semibold app-text disabled:opacity-40"
            >
              ➤
              <div className="mt-1 text-[11px] app-muted">Skip</div>
            </button>

            <button
              disabled={busy}
              onClick={next}
              className="rounded-xl app-card px-4 py-3 font-semibold app-text"
            >
              ✖
              <div className="mt-1 text-[11px] app-muted">Pass</div>
            </button>

        <button
         disabled={busy}
         onClick={like}
         className="rounded-xl app-primary-glow app-glow-pulse px-4 py-3 font-semibold"
        >
         ❤️
         <div className="mt-1 text-[11px] text-white/90">Like</div>
        </button>
            <button
              disabled={busy}
              onClick={() => setShowDate(true)}
              className="rounded-xl app-card px-4 py-3 font-semibold app-text"
            >
              📅❤️
              <div className="mt-1 text-[11px] app-muted">Date</div>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
