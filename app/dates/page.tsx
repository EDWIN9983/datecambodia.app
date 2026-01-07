"use client";

import PageShell from "@/components/PageShell";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  doc as docRef,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import type { DateRequestDoc, UserDoc } from "@/lib/types";

type ReqWithId = DateRequestDoc & { id: string };

function isExpired(date: string, time: string) {
  const d = new Date(`${date} ${time}`);
  return Date.now() > d.getTime();
}

export default function DatesPage() {
  const router = useRouter();

  const [me, setMe] = useState<UserDoc | null>(null);
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [received, setReceived] = useState<ReqWithId[]>([]);
  const [sent, setSent] = useState<ReqWithId[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const snap = await getDoc(docRef(db, "users", user.uid));
      if (!snap.exists()) {
        router.replace("/profile-setup");
        return;
      }

      setMe({ uid: user.uid, ...(snap.data() as UserDoc) });
    });

    return () => unsub();
  }, [router]);

  async function expireIfNeeded(r: ReqWithId) {
    if (r.status !== "pending") return;
    if (!isExpired(r.date, r.time)) return;

    await updateDoc(docRef(db, "dateRequests", r.id), {
      status: "expired",
    });
  }

  async function load(uid: string) {
    const rQ = query(
      collection(db, "dateRequests"),
      where("toUser", "==", uid),
      orderBy("createdAt", "desc")
    );

    const sQ = query(
      collection(db, "dateRequests"),
      where("fromUser", "==", uid),
      orderBy("createdAt", "desc")
    );

    const [rSnap, sSnap] = await Promise.all([getDocs(rQ), getDocs(sQ)]);

    const r = rSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as DateRequestDoc),
    }));

    const s = sSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as DateRequestDoc),
    }));

    await Promise.all([...r, ...s].map(expireIfNeeded));

    setReceived(r);
    setSent(s);
  }

  useEffect(() => {
    if (me) load(me.uid);
  }, [me]);

  async function respond(id: string, status: "accepted" | "declined") {
    await updateDoc(docRef(db, "dateRequests", id), {
      status,
      respondedAt: serverTimestamp(),
      seenBySender: false,
    });

    if (status === "accepted") {
      const snap = await getDoc(docRef(db, "dateRequests", id));
      if (snap.exists()) {
        const data = snap.data() as DateRequestDoc;

        const a = data.fromUser;
        const b = data.toUser;
        const chatId = a < b ? `${a}_${b}` : `${b}_${a}`;

        await setDoc(
          docRef(db, "chats", chatId),
          {
            users: [a, b],
            createdAt: serverTimestamp(),
            isMatched: true,
            isUnlocked: false,
            lastMessage: null,
          },
          { merge: true }
        );
      }
    }

    setToast(status === "accepted" ? "Accepted ✅" : "Declined ❌");
    if (me) await load(me.uid);
    setTimeout(() => setToast(null), 1200);
  }

  async function markSeen(id: string) {
    await updateDoc(docRef(db, "dateRequests", id), {
      seenBySender: true,
    });
  }

  if (!me) return null;

  return (
    <PageShell title="Dates">
      {toast && (
        <div className="mb-3 rounded-xl app-card p-3 text-sm app-text">
          {toast}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab("received")}
          className={
            tab === "received"
              ? "app-primary rounded-xl px-4 py-2 text-sm font-semibold"
              : "rounded-xl app-card px-4 py-2 text-sm font-semibold app-text"
          }
        >
          Received
        </button>

        <button
          onClick={() => setTab("sent")}
          className={
            tab === "sent"
              ? "app-primary rounded-xl px-4 py-2 text-sm font-semibold"
              : "rounded-xl app-card px-4 py-2 text-sm font-semibold app-text"
          }
        >
          Sent
        </button>
      </div>

      {tab === "received" ? (
        <div className="space-y-3">
          {received.length === 0 && <Empty text="No received requests yet." />}

          {received.map((r) => (
            <div key={r.id} className="app-card rounded-2xl p-4">
              <button
                onClick={() => {
                  if (me.isPremium) {
                    router.push(`/u/${r.fromUser}`);
                  } else {
                    setToast("View profile is a Premium feature");
                    setTimeout(() => setToast(null), 1500);
                  }
                }}
                className="text-sm app-muted underline"
              >
                View Profile
              </button>

              <div className="mt-1 text-lg font-semibold app-text">
                {r.date} • {r.time}
              </div>

              <div className="mt-1 text-sm app-text">{r.place}</div>

              <div className="mt-3 flex gap-2">
                <button
                  disabled={r.status !== "pending"}
                  onClick={() => respond(r.id, "accepted")}
                  className="flex-1 app-primary rounded-xl px-4 py-2 font-semibold disabled:opacity-50"
                >
                  Accept
                </button>

                <button
                  disabled={r.status !== "pending"}
                  onClick={() => respond(r.id, "declined")}
                  className="flex-1 app-card rounded-xl px-4 py-2 font-semibold app-text disabled:opacity-50"
                >
                  Decline
                </button>
              </div>

              <div className="mt-2 text-xs app-muted">
                Status: {r.status}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sent.length === 0 && <Empty text="No sent requests yet." />}

          {sent.map((r) => (
            <div key={r.id} className="app-card rounded-2xl p-4">
              <button
                onClick={() => router.push(`/u/${r.toUser}`)}
                className="text-sm app-muted underline"
              >
                View Profile
              </button>

              <div className="mt-1 text-lg font-semibold app-text">
                {r.date} • {r.time}
              </div>

              <div className="mt-1 text-sm app-text">{r.place}</div>

              {r.status === "accepted" ? (
                <div className="mt-3 rounded-xl app-card p-3 text-sm app-text">
                  🎉 Your date is confirmed.
                  <button
                    onClick={() => {
                      markSeen(r.id);
                      const a = r.fromUser;
                      const b = r.toUser;
                      const chatId = a < b ? `${a}_${b}` : `${b}_${a}`;
                      router.push(`/messages/${chatId}`);
                    }}
                    className="mt-2 w-full app-primary rounded-xl px-4 py-2 text-sm font-semibold"
                  >
                    Discuss Date
                  </button>
                </div>
              ) : r.status === "declined" ? (
                <div className="mt-3 rounded-xl app-card p-3 text-sm app-text">
                  ❌ Your request was rejected.
                </div>
              ) : r.status === "expired" ? (
                <div className="mt-3 rounded-xl app-card p-3 text-sm app-text">
                  ⏰ This date request expired.
                </div>
              ) : (
                <div className="mt-2 text-xs app-muted">
                  Status: {r.status}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="app-card rounded-2xl p-6 text-center text-sm app-muted">
      {text}
    </div>
  );
}
