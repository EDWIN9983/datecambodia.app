"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import {
  Heart,
  Flame,
  CalendarHeart,
  MessageCircleHeart,
  PartyPopper,
} from "lucide-react";

const tabs = [
  { href: "/home", label: "Home", Icon: Heart },
  { href: "/discover", label: "Discover", Icon: Flame },
  { href: "/dates", label: "Dates", Icon: CalendarHeart },
  { href: "/messages", label: "Message", Icon: MessageCircleHeart },
  { href: "/pubs", label: "Pubs", Icon: PartyPopper },
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

      const likesQ = query(
        collection(db, "likes"),
        where("toUser", "==", uid)
      );

      const unsubLikes = onSnapshot(
        likesQ,
        (snap) => setHasDiscoverNotif(!snap.empty),
        () => setHasDiscoverNotif(false)
      );

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
            if (
              data?.lastMessage?.senderId &&
              data.lastMessage.senderId !== uid
            ) {
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
              className="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-md hover:bg-gray-50 transition"
              aria-current={active ? "page" : undefined}
            >
              <span className="relative">
                <tab.Icon
                  size={24}
                  strokeWidth={2}
                  className={
                    active
                      ? "text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.9)] animate-pulse"
                      : "text-pink-300/50 hover:text-pink-400 transition"
                  }
                />

                {showDot && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
                )}
              </span>

              <span
                className={`text-xs font-medium ${
                  active ? "text-pink-600" : "text-gray-400"
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
