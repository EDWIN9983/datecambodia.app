"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

const tabs = [
  { href: "/home", label: "Home", icon: "🏠" },
  { href: "/discover", label: "Discover", icon: "🔍" },
  { href: "/dates", label: "Dates", icon: "📅" },
  { href: "/messages", label: "Message", icon: "💬" },
  { href: "/pubs", label: "Pubs", icon: "🎉" },
];

export default function BottomNav() {
  const path = usePathname();

  const [hasDateNotif, setHasDateNotif] = useState(false);
  const [hasMessageNotif, setHasMessageNotif] = useState(false);
  const [hasDiscoverNotif, setHasDiscoverNotif] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const uid = user.uid;

      // DATES: responses not yet seen by sender (allowed)
      const datesQ = query(
        collection(db, "dateRequests"),
        where("fromUser", "==", uid),
        where("seenBySender", "==", false)
      );

      const unsubDates = onSnapshot(
        datesQ,
        (snap) => setHasDateNotif(!snap.empty),
        () => setHasDateNotif(false)
      );

      // DISCOVER: incoming likes (no extra fields)
      const likesQ = query(
        collection(db, "likes"),
        where("toUser", "==", uid)
      );

      const unsubLikes = onSnapshot(
        likesQ,
        (snap) => setHasDiscoverNotif(!snap.empty),
        () => setHasDiscoverNotif(false)
      );

      // MESSAGES: unread based on lastMessage.senderId only (allowed)
      const chatsQ = query(
        collection(db, "chats"),
        where("users", "array-contains", uid)
      );

      const unsubChats = onSnapshot(
        chatsQ,
        (snap) => {
          let unread = false;
          for (const d of snap.docs) {
            const data = d.data() as any;
            if (data?.lastMessage?.senderId && data.lastMessage.senderId !== uid) {
              unread = true;
              break;
            }
          }
          setHasMessageNotif(unread);
        },
        () => setHasMessageNotif(false)
      );

      return () => {
        unsubDates();
        unsubLikes();
        unsubChats();
      };
    });

    return () => unsubAuth();
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white z-50">
      <div className="mx-auto flex max-w-md justify-between px-4 py-2">
        {tabs.map((tab) => {
          const active = path.startsWith(tab.href);
          const showDot =
            (tab.href === "/dates" && hasDateNotif) ||
            (tab.href === "/messages" && hasMessageNotif) ||
            (tab.href === "/discover" && hasDiscoverNotif);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-md hover:bg-gray-50"
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`relative text-lg ${
                  active ? "text-[var(--primary)]" : "text-[#7A7A7A]"
                }`}
              >
                {tab.icon}
                {showDot && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </span>
              <span
                className={`text-xs font-medium ${
                  active ? "text-[var(--primary)]" : "text-[#7A7A7A]"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
