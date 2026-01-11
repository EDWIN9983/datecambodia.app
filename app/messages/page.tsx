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
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatDoc = {
  users: string[];
  createdAt?: any;
  isMatched?: boolean;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: any;
  } | null;
  unread?: Record<string, number>;
};

type ChatPreview = {
  chatId: string;
  otherUid: string;
  otherName: string;
  otherPhoto?: string;
  lastText: string;
  lastAt: any | null;
  unreadCount: number;
};

function makeChatId(a: string, b: string) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

function formatTime(ts: any) {
  try {
    if (!ts) return "";
    const d = ts?.toDate?.() ? ts.toDate() : new Date(ts);
    const hh = `${d.getHours()}`.padStart(2, "0");
    const mm = `${d.getMinutes()}`.padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

export default function MessagesPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserDoc | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        router.replace("/profile-setup");
        return;
      }

      setMe({ uid: user.uid, ...(snap.data() as UserDoc) });
    });

    return () => unsub();
  }, [router]);

  if (!me) return null;
  return <MessagesInner me={me} />;
}

function MessagesInner({ me }: { me: UserDoc }) {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [previews, setPreviews] = useState<ChatPreview[]>([]);
  const unsubRefs = useRef<(() => void)[]>([]);
  const router = useRouter();

  function pop(msg: string, ms = 1500) {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  }

  function clearUnsubs() {
    for (const u of unsubRefs.current) {
      try {
        u();
      } catch {}
    }
    unsubRefs.current = [];
  }

  async function fetchUser(uid: string) {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const u = { uid, ...(snap.data() as UserDoc) } as UserDoc;
    if (u.isBanned) return null;
    return u;
  }

  async function ensureChat(myUid: string, otherUid: string) {
    const chatId = makeChatId(myUid, otherUid);
    const ref = doc(db, "chats", chatId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const users = chatId.split("_");
      await setDoc(ref, {
        users,
        createdAt: serverTimestamp(),
        isMatched: true,
        lastMessage: null,
        unread: {
          [users[0]]: 0,
          [users[1]]: 0,
        },
      } as ChatDoc);
    }

    return chatId;
  }

  async function load() {
    setLoading(true);
    clearUnsubs();

    try {
      const chatSnap = await getDocs(
        query(collection(db, "chats"), where("users", "array-contains", me.uid))
      );

      const nextMap = new Map<string, ChatPreview>();

      for (const d of chatSnap.docs) {
        const data = d.data() as ChatDoc;
        const chatId = d.id;
        const otherUid = data.users.find((u) => u !== me.uid);
        if (!otherUid) continue;

        const other = await fetchUser(otherUid);
        if (!other) continue;

        const unsub = onSnapshot(
          doc(db, "chats", chatId),
          (snap) => {
            if (!snap.exists()) return;
            const c = snap.data() as ChatDoc;

            const unreadCount = c.unread?.[me.uid] || 0;

            nextMap.set(chatId, {
              chatId,
              otherUid,
              otherName: other.name || "User",
              otherPhoto: other.photos?.[0],
              lastText: c.lastMessage?.text || "",
              lastAt: c.lastMessage?.createdAt || null,
              unreadCount,
            });

            const sorted = Array.from(nextMap.values()).sort((a, b) => {
              const at = a.lastAt?.toMillis?.() ? a.lastAt.toMillis() : 0;
              const bt = b.lastAt?.toMillis?.() ? b.lastAt.toMillis() : 0;
              return bt - at;
            });

            setPreviews(sorted);
          },
          () => pop("Failed to load chats")
        );

        unsubRefs.current.push(unsub);
      }

      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      pop(e?.message || "Failed to load");
    }
  }

  useEffect(() => {
    load();
    return () => clearUnsubs();
  }, [me.uid]);

  const empty = useMemo(() => !loading && previews.length === 0, [loading, previews.length]);

  return (
    <PageShell title="Messages">
      {toast && <div className="mb-3 app-card p-3 text-sm app-text">{toast}</div>}

      {loading ? (
        <div className="app-card rounded-2xl p-6 text-center text-sm app-muted">
          Loading…
        </div>
      ) : empty ? (
        <div className="app-card rounded-2xl p-6 text-center text-sm app-muted">
          No messages yet.
        </div>
      ) : (
        <div className="space-y-3">
          {previews.map((p) => (
            <Link
              key={p.chatId}
              href={`/messages/${p.chatId}`}
              className="app-card rounded-2xl p-4 block"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-xl app-card">
                  {p.otherPhoto ? (
                    <img src={p.otherPhoto} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold app-text truncate">
                      {p.otherName}
                    </div>
                    <div className="flex items-center gap-2">
                      {p.unreadCount > 0 && (
                        <div className="rounded-full app-primary px-2 py-0.5 text-xs font-semibold">
                          {p.unreadCount}
                        </div>
                      )}
                      <div className="text-xs app-muted">
                        {formatTime(p.lastAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs app-muted truncate">
                    {p.lastText ? p.lastText : "Say hi…"}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <button
        onClick={() => load()}
        className="mt-4 w-full rounded-xl app-card px-4 py-3 text-sm font-semibold app-text"
      >
        Refresh
      </button>
    </PageShell>
  );
}
