"use client";

import PageShell from "@/components/PageShell";
import { auth, db } from "@/lib/firebase";
import type { UserDoc } from "@/lib/types";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
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

  const [storeConfig, setStoreConfig] = useState({
    premium7Days: 4.99,
    premium30Days: 14.99,
    premium90Days: 29.99,
    discountPercent: 0,
    discountEnabled: false,
    discountLabel: "",
    discountEndsAt: null as Timestamp | null,
  });

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

      setMe({
        ...(snap.data() as UserDoc),
        uid: u.uid,
      });

      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "adminConfig", "store"),
      (snap) => {
        if (!snap.exists()) return;

        const raw = snap.data();

        setStoreConfig({
          premium7Days: raw.premium7Days ?? 4.99,
          premium30Days: raw.premium30Days ?? 14.99,
          premium90Days: raw.premium90Days ?? 29.99,
          discountPercent: raw.discountPercent ?? 0,
          discountEnabled: raw.discountEnabled ?? false,
          discountLabel: raw.discountLabel ?? "",
          discountEndsAt:
            raw.discountEndsAt instanceof Timestamp
              ? raw.discountEndsAt
              : null,
        });
      }
    );

    return () => unsub();
  }, []);

  const premiumUntil = useMemo(() => {
    if (!me?.coinBUntil) return null;

    return me.coinBUntil instanceof Timestamp
      ? me.coinBUntil.toDate()
      : null;
  }, [me]);

  const premiumActive =
    premiumUntil && premiumUntil.getTime() > Date.now();

  const discountActive =
    storeConfig.discountEnabled &&
    storeConfig.discountPercent > 0 &&
    storeConfig.discountEndsAt &&
    storeConfig.discountEndsAt.toDate().getTime() > Date.now();

  function redirectToTelegram(message: string) {
    const url = `https://t.me/datecambodia?text=${encodeURIComponent(
      message
    )}`;

    window.open(url, "_blank");
  }

  if (loading || !me) return null;

  return (
    <PageShell title="Store">
      <div className="space-y-6">

        <div className="rounded-3xl app-card p-6 text-center">
          <div className="text-xl font-semibold app-text">
            💖 Unlock Your Dating Power
          </div>

          <div className="mt-2 text-sm app-muted">
            Go premium to send unlimited likes, more date requests,
            and connect faster with real matches.
          </div>

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

          {discountActive && (
            <div className="mt-4 rounded-xl bg-pink-500/10 border border-pink-400/30 px-4 py-3 text-sm text-pink-400 font-semibold">
              🔥 {storeConfig.discountLabel || "Limited Time Offer"} —{" "}
              {storeConfig.discountPercent}% OFF

              <div className="mt-1 text-xs opacity-80">
                Ends{" "}
                {formatDate(
                  storeConfig.discountEndsAt!.toDate()
                )}
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[7, 30, 90].map((days) => {
              const basePrice =
                days === 7
                  ? storeConfig.premium7Days
                  : days === 30
                  ? storeConfig.premium30Days
                  : storeConfig.premium90Days;

              const finalPrice = discountActive
                ? (
                    basePrice *
                    (1 - storeConfig.discountPercent / 100)
                  ).toFixed(2)
                : basePrice.toFixed(2);

              return (
                <button
                  key={days}
                  onClick={() =>
                    redirectToTelegram(
                      `Hi, I want to buy ${days} Days Premium for $${finalPrice}`
                    )
                  }
                  className="rounded-2xl app-primary glow-btn px-4 py-3 text-sm font-semibold shadow-lg hover:scale-[1.02] transition"
                >
                  <div>Buy {days} Days</div>

                  <div className="mt-1 text-xs font-normal">
                    {discountActive ? (
                      <>
                        <span className="line-through opacity-60 mr-1">
                          ${basePrice.toFixed(2)}
                        </span>
                        ${finalPrice}
                      </>
                    ) : (
                      <>${finalPrice}</>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

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
            {[10, 50, 100, 500].map((amount) => (
              <button
                key={amount}
                onClick={() =>
                  redirectToTelegram(
                    `Hi, I want to buy ${amount} Pulses`
                  )
                }
                className="rounded-2xl app-card px-4 py-3 text-sm font-semibold app-text shadow hover:scale-[1.02] transition"
              >
                +{amount} Pulses
              </button>
            ))}
          </div>
        </div>

      </div>
    </PageShell>
  );
}