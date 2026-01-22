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
  increment,
  runTransaction,
  Timestamp,
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
  const [reopening, setReopening] = useState<string | null>(null);

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

      setMe(snap.data() as UserDoc);
    });

    return () => unsub();
  }, [router]);

  async function expireIfNeeded(r: ReqWithId) {
    if (r.status !== "pending") return;
    if (!r.date || !r.time) return;
    if (!isExpired(r.date, r.time)) return;

    try {
      await updateDoc(docRef(db, "dateRequests", r.id), {
        status: "expired",
      });
    } catch {
      return;
    }
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
    const reqRef = docRef(db, "dateRequests", id);

    const beforeSnap = await getDoc(reqRef);
    if (!beforeSnap.exists()) {
      setToast("Request not found");
      setTimeout(() => setToast(null), 1200);
      return;
    }

    const beforeData = beforeSnap.data() as DateRequestDoc;

    try {
      await updateDoc(reqRef, {
        status,
        respondedAt: serverTimestamp(),
        seenBySender: false,
      });
    } catch {
      setToast("Failed to update");
      setTimeout(() => setToast(null), 1200);
      return;
    }

    if (status === "accepted") {
      if (!beforeData.date || !beforeData.time) return;

      const a = beforeData.fromUser;
      const b = beforeData.toUser;
      const chatId = a < b ? `${a}_${b}` : `${b}_${a}`;
      const dateAtValue = new Date(`${beforeData.date} ${beforeData.time}`);

      try {
        await Promise.all([
          updateDoc(docRef(db, "users", a), {
            dailyDateCount: increment(1),
          }),
          updateDoc(docRef(db, "users", b), {
            dailyDateCount: increment(1),
          }),
          setDoc(
            docRef(db, "chats", chatId),
            {
              users: [a, b],
              createdAt: serverTimestamp(),
              isMatched: true,
              isUnlocked: false,
              dateAt: dateAtValue,
              reopenUntil: null,
              lastMessage: null,
              unread: {
                [a]: 0,
                [b]: 0,
              },
            },
            { merge: true }
          ),
        ]);
      } catch {}
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

  async function reopenChatWithPulse(chatId: string) {
    if (!me) return;

    setReopening(chatId);

    try {
      const ok = await runTransaction(db, async (tx) => {
        const userRef = docRef(db, "users", me.uid);
        const chatRef = docRef(db, "chats", chatId);

        const [userSnap, chatSnap] = await Promise.all([
          tx.get(userRef),
          tx.get(chatRef),
        ]);

        if (!userSnap.exists()) return false;
        if (!chatSnap.exists()) return false;

        const userData = userSnap.data() as any;
        const coinsA = typeof userData?.coinsA === "number" ? userData.coinsA : 0;
        if (coinsA < 50) return false;

        const reopenUntil = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

        tx.update(userRef, { coinsA: coinsA - 50 });
        tx.set(
          chatRef,
          {
            isUnlocked: true,
            reopenUntil,
          },
          { merge: true }
        );

        return true;
      });

      if (!ok) {
        setToast("Not enough Pulse. Recharge in Store.");
        setTimeout(() => setToast(null), 1500);
        router.push("/store");
        return;
      }

      try {
        const snap = await getDoc(docRef(db, "users", me.uid));
        if (snap.exists()) setMe(snap.data() as UserDoc);
      } catch {}

      router.push(`/messages/${chatId}`);
    } catch {
      setToast("Failed to reopen");
      setTimeout(() => setToast(null), 1500);
    } finally {
      setReopening(null);
    }
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
              <button onClick={() => router.push(`/u/${r.fromUser}`)}>
                View Profile
              </button>

              <div className="mt-1 text-lg font-semibold app-text">
                {r.date} • {r.time}
              </div>

              <div className="mt-1 text-sm app-text">{r.place}</div>

              {r.status === "pending" ? (
                <>
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
                </>
              ) : r.status === "accepted" ? (
                r.date &&
                r.time &&
                isExpired(r.date, r.time) ? (
                  <div className="mt-3 rounded-xl app-card p-3 text-sm app-text">
                    💫 Hope you enjoyed your date.
                    <button
                      onClick={() => {
                        const a = r.fromUser;
                        const b = r.toUser;
                        const chatId = a < b ? `${a}_${b}` : `${b}_${a}`;
                        reopenChatWithPulse(chatId);
                      }}
                      disabled={
                        reopening ===
                        (r.fromUser < r.toUser
                          ? `${r.fromUser}_${r.toUser}`
                          : `${r.toUser}_${r.fromUser}`)
                      }
                      className="mt-2 w-full app-primary-glow app-glow-pulse rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"                    >
                      Reopen Chat · 50 Pulse
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl app-card p-3 text-sm app-text">
                    🎉 Your date is confirmed.
                    <button
                      onClick={() => {
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
                )
              ) : r.status === "declined" ? (
                <div className="mt-3 rounded-xl app-card p-3 text-sm app-text">
                  ❌ Your request was rejected.
                </div>
              ) : r.status === "expired" ? (
                <div className="mt-3 rounded-xl app-card p-3 text-sm app-text">
                  ⏰ This date request expired.
                </div>
              ) : (
                <div className="mt-2 text-xs app-muted">Status: {r.status}</div>
              )}
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
                r.date &&
                r.time &&
                isExpired(r.date, r.time) ? (
                  <div className="mt-3 rounded-xl app-card p-3 text-sm app-text">
                    💫 Hope you enjoyed your date.
                    <button
                      onClick={() => {
                        markSeen(r.id);
                        const a = r.fromUser;
                        const b = r.toUser;
                        const chatId = a < b ? `${a}_${b}` : `${b}_${a}`;
                        reopenChatWithPulse(chatId);
                      }}
                      disabled={
                        reopening ===
                        (r.fromUser < r.toUser
                          ? `${r.fromUser}_${r.toUser}`
                          : `${r.toUser}_${r.fromUser}`)
                      }
                      className="mt-2 w-full app-primary-glow app-glow-pulse rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      Reopen Chat · 50 Pulse
                    </button>
                  </div>
                ) : (
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
                )
              ) : r.status === "declined" ? (
                <div className="mt-3 rounded-xl app-card p-3 text-sm app-text">
                  ❌ Your request was rejected.
                </div>
              ) : r.status === "expired" ? (
                <div className="mt-3 rounded-xl app-card p-3 text-sm app-text">
                  ⏰ This date request expired.
                </div>
              ) : (
                <div className="mt-2 text-xs app-muted">Status: {r.status}</div>
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
