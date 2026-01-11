"use client";

import PageShell from "@/components/PageShell";
import { auth, db } from "@/lib/firebase";
import { UserDoc } from "@/lib/types";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function now() {
  return new Date();
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export default function StorePage() {
  const router = useRouter();
  const [me, setMe] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [inviteCount, setInviteCount] = useState(0);

  // --- Auth & fetch user ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        router.replace("/profile-setup");
        return;
      }

      const data = snap.data() as UserDoc;

      // Safe init wallet
      if (data.coinsA === undefined || data.coinBUntil === undefined) {
        await updateDoc(ref, {
          coinsA: data.coinsA ?? 0,
          coinBUntil: data.coinBUntil ?? addDays(0),
        });
      }

      setMe({ uid: user.uid, ...(data as UserDoc) });
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  if (loading || !me) return null;

  const hasHeart =
    me.coinBUntil && me.coinBUntil.toDate
      ? me.coinBUntil.toDate() > now()
      : false;

  // --- Wallet functions ---
  async function buyPulses(amount: number) {
    const ref = doc(db, "users", me.uid);
    await updateDoc(ref, {
      coinsA: (me.coinsA || 0) + amount,
      lastWalletUpdate: serverTimestamp(),
    });
    setMe((m) => (m ? { ...m, coinsA: (m.coinsA || 0) + amount } : m));
  }

  async function buyHeart(days: number) {
    const ref = doc(db, "users", me.uid);
    const currentUntil =
      me.coinBUntil && me.coinBUntil.toDate
        ? me.coinBUntil.toDate()
        : now();
    const base = currentUntil > now() ? currentUntil : now();
    const next = new Date(base);
    next.setDate(next.getDate() + days);

    await updateDoc(ref, {
      coinBUntil: next,
      lastWalletUpdate: serverTimestamp(),
    });

    setMe((m) => (m ? { ...m, coinBUntil: next as any } : m));
  }

  // --- Pulse → Heart conversion ---
  async function convertPulsesToHeart() {
    if ((me.coinsA || 0) < 10) return;
    await buyHeart(3); // add 3 days
    const ref = doc(db, "users", me.uid);
    await updateDoc(ref, {
      coinsA: (me.coinsA || 0) - 10,
      lastWalletUpdate: serverTimestamp(),
    });
    setMe((m) =>
      m ? { ...m, coinsA: (m.coinsA || 0) - 10 } : m
    );
  }

  // --- Daily reward claim ---
  async function claimDailyReward() {
    if (dailyClaimed) return;
    await buyPulses(1);
    setDailyClaimed(true);
  }

  // --- Invite reward (mock / share link) ---
  const inviteLink = "https://yourapp.com/signup?ref=" + me.uid;

  async function rewardInvite() {
    if (inviteCount >= 5) return; // max milestone
    await buyPulses(5);
    setInviteCount((c) => c + 1);
    if ((inviteCount + 1) % 5 === 0) {
      await buyHeart(3); // bonus Heart for milestone
    }
  }

  return (
    <PageShell title="Store">
      <div className="space-y-4">

        {/* WALLET */}
        <div className="app-card rounded-2xl p-4">
          <div className="text-lg font-semibold app-text">Your Wallet</div>
          <div className="mt-2 text-sm app-muted">
            ⚡ Pulses: <b>{me.coinsA ?? 0}</b>
          </div>
          <div className="mt-1 text-sm app-muted">
            ❤️ Premium: {hasHeart ? "Active" : "Inactive"}
          </div>
        </div>

        {/* BUY PULSES */}
        <div className="app-card rounded-2xl p-4">
          <div className="text-lg font-semibold app-text">
            Buy Pulses ⚡
          </div>
          <div className="mt-1 text-xs app-muted">
            Pulses increase chat limits, boosts, and extra actions
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[10, 50, 100, 500].map((n) => (
              <button
                key={n}
                onClick={() => buyPulses(n)}
                className="rounded-xl app-card px-4 py-2 text-sm font-semibold app-text"
              >
                +{n} Pulses
              </button>
            ))}
          </div>
        </div>

        {/* BUY HEART */}
        <div className="app-card rounded-2xl p-4">
          <div className="text-lg font-semibold app-text">
            Premium Access ❤️
          </div>
          <div className="mt-1 text-xs app-muted">
            Hearts unlock full access for a limited time
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[30, 90].map((days) => (
              <button
                key={days}
                onClick={() => buyHeart(days)}
                className="rounded-xl app-primary px-4 py-2 text-sm font-semibold"
              >
                ❤️ {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* PULSE → HEART */}
        <div className="app-card rounded-2xl p-4">
          <div className="text-lg font-semibold app-text">
            Convert Pulses to Heart ❤️
          </div>
          <div className="mt-1 text-xs app-muted">
            10 Pulses = 3 days of Premium
          </div>
          <button
            onClick={convertPulsesToHeart}
            className="mt-3 rounded-xl app-primary px-4 py-2 text-sm font-semibold"
          >
            Convert Now
          </button>
        </div>

        {/* DAILY REWARD */}
        <div className="app-card rounded-2xl p-4">
          <div className="text-lg font-semibold app-text">
            Daily Reward 🎁
          </div>
          <div className="mt-1 text-xs app-muted">
            Claim 1 Pulse per day
          </div>
          <button
            onClick={claimDailyReward}
            disabled={dailyClaimed}
            className={`mt-3 rounded-xl px-4 py-2 text-sm font-semibold ${
              dailyClaimed ? "app-card cursor-not-allowed" : "app-primary"
            }`}
          >
            {dailyClaimed ? "Claimed" : "Claim Now"}
          </button>
        </div>

        {/* INVITE / SHARE */}
        <div className="app-card rounded-2xl p-4 border-2 border-yellow-400 bg-yellow-50">
          <div className="text-lg font-semibold app-text">
            🎁 Invite Friends & Earn!
          </div>
          <div className="mt-2 text-sm app-muted">
            Each friend who signs up rewards you:
          </div>
          <ul className="mt-2 text-sm app-text list-disc list-inside">
            <li>+1 Heart ❤️ (3 days Premium)</li>
            <li>+5 Pulses ⚡</li>
          </ul>
          <div className="mt-3 flex gap-2 flex-wrap">
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="app-primary px-4 py-2 rounded-xl text-sm font-semibold"
            >
              Copy Invite Link
            </button>
            <button
              onClick={() => alert("Share to social")} // replace with real share
              className="app-secondary px-4 py-2 rounded-xl text-sm font-semibold"
            >
              Share on Social
            </button>
            <button
              onClick={rewardInvite}
              disabled={inviteCount >= 5}
              className="app-primary px-4 py-2 rounded-xl text-sm font-semibold"
            >
              Claim Invite Reward
            </button>
          </div>
          <div className="mt-2 text-xs app-muted">
            Invites completed: {inviteCount}/5 → Bonus Heart ❤️
          </div>
        </div>
      </div>
    </PageShell>
  );
}
