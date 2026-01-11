"use client";

import PageShell from "@/components/PageShell";
import { auth, db } from "@/lib/firebase";
import type { UserDoc } from "@/lib/types";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ActivityItem = {
  id: string;
  type: "like" | "system";
  text: string;
  createdAt: any;
  fromUser?: string;
  photo?: string;
};

function formatTime(ts: any) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString();
}

export default function Page() {
  const router = useRouter();

  const [me, setMe] = useState<UserDoc | null>(null);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* -----------------------------
     AUTH + PROFILE LOAD
  ------------------------------*/
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        router.replace("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", fbUser.uid));
      if (!snap.exists()) {
        router.replace("/profile-setup");
        return;
      }

      setMe(snap.data() as UserDoc);
    });

    return () => unsub();
  }, [router]);

  /* -----------------------------
     LOAD ACTIVITY (STRICT TS SAFE)
  ------------------------------*/
  useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;

    async function load() {
      setLoading(true);

      const likesQ = query(
        collection(db, "likes"),
        where("toUser", "==", uid),
        orderBy("createdAt", "desc")
      );

      const datesQ = query(
        collection(db, "dateRequests"),
        where("fromUser", "==", uid),
        orderBy("respondedAt", "desc")
      );

      const [likesSnap, datesSnap] = await Promise.all([
        getDocs(likesQ),
        getDocs(datesQ),
      ]);

      const likeItems: ActivityItem[] = [];

      for (const d of likesSnap.docs) {
        const fromUid = d.data().fromUser;
        if (!fromUid) continue;

        const uSnap = await getDoc(doc(db, "users", fromUid));
        if (!uSnap.exists()) continue;

        likeItems.push({
          id: d.id,
          type: "like",
          text: "❤️ Someone liked your profile",
          createdAt: d.data().createdAt,
          fromUser: fromUid,
          photo: uSnap.data().photos?.[0],
        });
      }

      const systemItems: ActivityItem[] = datesSnap.docs
        .filter((d) => d.data().status !== "pending")
        .map((d) => ({
          id: d.id,
          type: "system",
          text:
            d.data().status === "accepted"
              ? "🔔 Your date request was accepted"
              : d.data().status === "declined"
              ? "🔔 Your date request was declined"
              : "🔔 Your date request expired",
          createdAt: d.data().respondedAt || d.data().createdAt,
        }));

      const merged = [...likeItems, ...systemItems].sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });

      setItems(merged.slice(0, 50));
      setLoading(false);

      for (const d of datesSnap.docs) {
        if (d.data().seenBySender === false) {
          await updateDoc(doc(db, "dateRequests", d.id), {
            seenBySender: true,
          });
        }
      }
    }

    load();
  }, []);

  if (!me) return null;

  const isPremium = Boolean((me as any).isPremium);

  return (
    <PageShell title="Activity">
      {loading ? (
        <div className="app-card rounded-2xl p-6 text-center text-sm app-muted">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="app-card rounded-2xl p-6 text-center text-sm app-muted">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div
              key={`${i.type}-${i.id}`}
              className="app-card rounded-xl p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1">
                <div className="text-sm app-text">{i.text}</div>
                <div className="mt-1 text-xs app-muted">
                  {formatTime(i.createdAt)}
                </div>

                {i.type === "like" && (
                  <button
                    onClick={() =>
                      isPremium
                        ? router.push(`/u/${i.fromUser}`)
                        : router.push("/store")
                    }
                    className="mt-1 text-xs font-semibold app-primary underline"
                  >
                    {isPremium ? "View profile" : "Unlock to see who"}
                  </button>
                )}
              </div>

              {i.type === "like" && i.photo && (
                <div className="h-12 w-12 rounded-full overflow-hidden app-card">
                  <img
                    src={i.photo}
                    className={`h-full w-full object-cover ${
                      isPremium ? "" : "blur-md"
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
