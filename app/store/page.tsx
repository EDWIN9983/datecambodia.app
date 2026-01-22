"use client";

import PageShell from "@/components/PageShell";
import { auth, db } from "@/lib/firebase";
import type { UserDoc } from "@/lib/types";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function formatDate(d: Date) {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StorePage() {
  const router = useRouter();
  const [me, setMe] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", u.uid));
      if (!snap.exists()) {
        router.replace("/profile-setup");
        return;
      }

      setMe({ ...(snap.data() as UserDoc), uid: u.uid });
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const premiumUntil = useMemo(() => {
    if (!me?.coinBUntil) return null;
    return me.coinBUntil instanceof Timestamp
      ? me.coinBUntil.toDate()
      : null;
  }, [me]);

  const premiumActive =
    premiumUntil && premiumUntil.getTime() > Date.now();

  if (loading || !me) return null;

  return (
    <PageShell title="Store">
      <div className="space-y-6">

        {/* HERO */}
        <div className="rounded-3xl app-card p-6 text-center">
          <div className="text-xl font-semibold app-text">
            💖 Unlock Your Dating Power
          </div>

          <div className="mt-2 text-sm app-muted">
            Go premium to send unlimited likes, more date requests, and connect faster with real matches.
          </div>

          {/* SOCIAL PROOF MOCK */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-white font-semibold">
              U
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold app-text">
                User_4821 activated Premium
              </div>
              <div className="text-xs app-muted">
                30 days of unlimited dating power
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">

            {/* PREMIUM STATUS */}
            <div className="relative rounded-2xl app-card p-4 border border-pink-400/40">
              <div className="absolute -top-2 -right-2 rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                VIP
              </div>

              <div className="flex items-center justify-center gap-2 text-sm app-text">
                <span className="font-semibold">Premium Member</span>
              </div>

              <div className="mt-2 text-sm font-semibold text-pink-400">
                {premiumActive ? "Active" : "Inactive"}
              </div>

              {premiumActive && premiumUntil && (
                <div className="mt-1 text-xs app-muted">
                  Active until {formatDate(premiumUntil)}
                </div>
              )}
            </div>

            {/* PULSES */}
            <div className="rounded-2xl app-card p-4">
              <div className="flex items-center justify-center gap-2 text-sm app-text">
                <span className="font-semibold">Your Pulses</span>
              </div>

              <div className="mt-2 text-lg font-semibold text-yellow-400">
                {me.coinsA ?? 0}
              </div>

              <div className="mt-1 text-xs app-muted">
                Extra likes, date requests & messages
              </div>
            </div>

          </div>
        </div>

        {/* PREMIUM BUY */}
        <div className="rounded-3xl app-card p-6">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold app-text">
              🌟 Premium Access
            </div>
          </div>

          <div className="mt-2 text-sm app-muted">
            Remove limits. Match faster. Get more attention.
          </div>

          <div className="mt-4 space-y-2 text-sm app-text">
            <div>❤️ Unlimited Likes</div>
            <div>📅 More Date Requests</div>
            <div>👀 See Who Viewed You</div>
            <div>💬 Send More Messages</div>
            <div>⚡ Faster Matching</div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="rounded-2xl app-primary px-4 py-3 text-sm font-semibold shadow-lg hover:scale-[1.02] transition">
              Buy 30 Days
            </button>
            <button className="rounded-2xl app-primary px-4 py-3 text-sm font-semibold shadow-lg hover:scale-[1.02] transition">
              Buy 90 Days
            </button>
          </div>
        </div>

        {/* PULSES BUY */}
        <div className="rounded-3xl app-card p-6">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold app-text">
              ⚡ Power Boosts
            </div>
          </div>

          <div className="mt-2 text-sm app-muted">
            Use Pulses to go beyond daily limits when it matters most.
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="rounded-2xl app-card px-4 py-3 text-sm font-semibold app-text shadow hover:scale-[1.02] transition">
              +10 Pulses
            </button>
            <button className="rounded-2xl app-card px-4 py-3 text-sm font-semibold app-text shadow hover:scale-[1.02] transition">
              +50 Pulses
            </button>
            <button className="rounded-2xl app-card px-4 py-3 text-sm font-semibold app-text shadow hover:scale-[1.02] transition">
              +100 Pulses
            </button>
            <button className="rounded-2xl app-card px-4 py-3 text-sm font-semibold app-text shadow hover:scale-[1.02] transition">
              +500 Pulses
            </button>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
