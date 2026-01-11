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
      <div className="space-y-4">

        {/* HERO */}
        <div className="rounded-2xl app-card p-5">
          <div className="text-lg font-semibold app-text">
            Upgrade your experience
          </div>

          <div className="mt-1 text-sm app-muted">
            Premium for limits • Pulses for extra actions
          </div>

          <div className="mt-4 flex justify-center">
            <img
              src="/heart.svg"
              alt="Premium"
              className="h-20 sm:h-24 md:h-28 w-auto
                         drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)]"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">

            {/* PREMIUM STATUS */}
            <div className="rounded-xl app-card p-3">
              <div className="flex items-center gap-2 text-sm app-text">
                <img src="/heart.svg" className="h-4 w-auto" />
                <span className="font-semibold">Premium</span>
              </div>

              <div className="mt-1 text-sm app-text">
                {premiumActive ? "Active" : "Inactive"}
              </div>

              {premiumActive && premiumUntil && (
                <div className="mt-1 text-xs app-muted">
                  Expires {formatDate(premiumUntil)}
                </div>
              )}
            </div>

            {/* PULSES */}
            <div className="rounded-xl app-card p-3">
              <div className="flex items-center gap-2 text-sm app-text">
                <img src="/pulse.svg" className="h-4 w-auto" />
                <span className="font-semibold">Pulses</span>
              </div>

              <div className="mt-1 text-sm app-text">
                {me.coinsA ?? 0}
              </div>

              <div className="mt-1 text-xs app-muted">
                Extra likes, requests, messages
              </div>
            </div>

          </div>
        </div>

        {/* PREMIUM BUY */}
        <div className="rounded-2xl app-card p-5">
          <div className="flex items-center gap-2">
            <img src="/heart.svg" className="h-5 w-auto" />
            <div className="text-base font-semibold app-text">
              Premium (Heart)
            </div>
          </div>

          <div className="mt-2 text-sm app-muted">
            Removes limits and pulse costs.
          </div>

          <div className="mt-3 space-y-2 text-sm app-text">
            <div className="flex justify-between">
              <span>Likes per day</span>
              <span className="font-semibold">99</span>
            </div>
            <div className="flex justify-between">
              <span>Date requests</span>
              <span className="font-semibold">15</span>
            </div>
            <div className="flex justify-between">
              <span>Profile visitors</span>
              <span className="font-semibold">Free</span>
            </div>
            <div className="flex justify-between">
              <span>Messages</span>
              <span className="font-semibold">Higher</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="rounded-xl app-primary px-4 py-2 text-sm font-semibold">
              Buy 30 Days
            </button>
            <button className="rounded-xl app-primary px-4 py-2 text-sm font-semibold">
              Buy 90 Days
            </button>
          </div>
        </div>

        {/* PULSES BUY */}
        <div className="rounded-2xl app-card p-5">
          <div className="flex items-center gap-2">
            <img src="/pulse.svg" className="h-5 w-auto" />
            <div className="text-base font-semibold app-text">
              Pulses
            </div>
          </div>

          <div className="mt-2 text-sm app-muted">
            Go beyond daily limits when it matters.
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="rounded-xl app-card px-4 py-2 text-sm font-semibold app-text">
              +10 Pulses
            </button>
            <button className="rounded-xl app-card px-4 py-2 text-sm font-semibold app-text">
              +50 Pulses
            </button>
            <button className="rounded-xl app-card px-4 py-2 text-sm font-semibold app-text">
              +100 Pulses
            </button>
            <button className="rounded-xl app-card px-4 py-2 text-sm font-semibold app-text">
              +500 Pulses
            </button>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
