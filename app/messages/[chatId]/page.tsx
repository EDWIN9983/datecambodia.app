"use client";

import PageShell from "@/components/PageShell";
import { auth, db } from "@/lib/firebase";
import type { UserDoc } from "@/lib/types";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
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
};

type MsgDoc = {
  senderId: string;
  text: string;
  createdAt: any;
};

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

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = typeof params?.chatId === "string" ? params.chatId : null;

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

  if (!me || !chatId) return null;

  return <ChatInner me={me} chatId={chatId} />;
}

function ChatInner({ me, chatId }: { me: UserDoc; chatId: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [other, setOther] = useState<UserDoc | null>(null);
  const [messages, setMessages] = useState<(MsgDoc & { id: string })[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  function pop(msg: string, ms = 1500) {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  }

  useEffect(() => {
    async function init() {
      const chatSnap = await getDoc(doc(db, "chats", chatId));
      if (!chatSnap.exists()) {
        router.replace("/messages");
        return;
      }

      const chat = chatSnap.data() as ChatDoc;
      if (!chat?.users || chat.users.length !== 2) {
        router.replace("/messages");
        return;
      }

      if (!chat.users.includes(me.uid)) {
        router.replace("/messages");
        return;
      }

      const otherUid = chat.users[0] === me.uid ? chat.users[1] : chat.users[0];
      const otherSnap = await getDoc(doc(db, "users", otherUid));
      if (otherSnap.exists()) {
        setOther({ uid: otherUid, ...(otherSnap.data() as UserDoc) });
      } else {
        setOther({ uid: otherUid } as UserDoc);
      }

      const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("createdAt", "asc")
      );

      unsubRef.current = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as MsgDoc),
          }));
          setMessages(list);
          setReady(true);
          window.setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 10);
        },
        () => {
          pop("Failed to load messages");
          setReady(true);
        }
      );
    }

    init();

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [chatId, me.uid, router]);

  const title = useMemo(() => {
    if (!other) return "Messages";
    return other.name ? other.name : "Chat";
  }, [other]);

  async function send() {
    const t = text.trim();
    if (!t) return;

    setSending(true);
    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: me.uid,
        text: t,
        createdAt: serverTimestamp(),
      } as MsgDoc);

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: {
          text: t,
          senderId: me.uid,
          createdAt: serverTimestamp(),
        },
      } as Partial<ChatDoc>);

      setText("");
      window.setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 10);
    } catch (e: any) {
      pop(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell title={title}>
      {toast && <div className="mb-3 app-card p-3 text-sm app-text">{toast}</div>}

      {!ready ? (
        <div className="app-card rounded-2xl p-6 text-center text-sm app-muted">
          Loading…
        </div>
      ) : (
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="app-card rounded-2xl p-6 text-center text-sm app-muted">
              No messages yet.
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="app-card rounded-2xl p-3">
                <div className="text-sm app-text whitespace-pre-wrap">
                  {m.text}
                </div>
                <div className="mt-1 text-xs app-muted">
                  {formatTime(m.createdAt)}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="mt-4 app-card rounded-2xl p-3">
        <textarea
          className="w-full app-input"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          onClick={send}
          disabled={sending || text.trim().length === 0}
          className="mt-3 w-full app-primary rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>

        <button
          onClick={() => router.replace("/messages")}
          className="mt-2 w-full rounded-xl app-card px-4 py-3 text-sm font-semibold app-text"
        >
          Back
        </button>
      </div>
    </PageShell>
  );
}
