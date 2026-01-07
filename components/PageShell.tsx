"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import BottomNav from "@/components/BottomNav";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

type Props = {
  title?: string;
  children: ReactNode;
  stickyMenu?: ReactNode;
};

export default function PageShell({ title, children, stickyMenu }: Props) {
  const [open, setOpen] = useState(false);
  const [hasLikeNotif, setHasLikeNotif] = useState(false);
  const [hasSystemNotif, setHasSystemNotif] = useState(false);

  async function logout() {
    await signOut(auth);
    window.location.href = "/login";
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const uid = user.uid;

      const likesQ = query(
        collection(db, "likes"),
        where("toUser", "==", uid),
        where("seen", "==", false)
      );

      const datesQ = query(
        collection(db, "dateRequests"),
        where("fromUser", "==", uid),
        where("seenBySender", "==", false)
      );

      const [likesSnap, datesSnap] = await Promise.all([
        getDocs(likesQ),
        getDocs(datesQ),
      ]);

      setHasLikeNotif(!likesSnap.empty);
      setHasSystemNotif(!datesSnap.empty);
    });

    return () => unsub();
  }, []);

  const showDot = hasLikeNotif || hasSystemNotif;
  const showPulse = hasLikeNotif && hasSystemNotif;

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <h1 className="text-lg font-semibold">{title}</h1>

        <div className="flex items-center gap-4">
          {/* Notification Icon */}
          <Link
            href="/activity"
            className="relative text-xl"
            aria-label="Notifications"
          >
            ❤️
            {showDot && (
              <span
                className={`absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ${
                  showPulse ? "animate-ping" : ""
                }`}
              />
            )}
          </Link>

          {/* Hamburger */}
          <button onClick={() => setOpen(!open)} className="text-xl">
            ☰
          </button>
        </div>
      </header>

      {/* Sticky menu (optional) */}
      {stickyMenu}

      {/* Hamburger menu */}
      {open && (
        <div className="absolute top-14 right-4 z-50 w-48 rounded-xl border bg-white shadow">
          <nav className="flex flex-col divide-y text-sm">
            <Link href="/home" className="px-4 py-3" onClick={() => setOpen(false)}>
              Home
            </Link>
            <Link href="/discover" className="px-4 py-3" onClick={() => setOpen(false)}>
              Discover
            </Link>
            <Link href="/dates" className="px-4 py-3" onClick={() => setOpen(false)}>
              Dates
            </Link>
            <Link href="/pubs" className="px-4 py-3" onClick={() => setOpen(false)}>
              Pubs & Events
            </Link>
            <Link href="/profile" className="px-4 py-3" onClick={() => setOpen(false)}>
              Profile
            </Link>
            <Link href="/store" className="px-4 py-3" onClick={() => setOpen(false)}>
              Store
            </Link>
            <Link href="/legal" className="px-4 py-3" onClick={() => setOpen(false)}>
              Info
            </Link>

            <button
              onClick={logout}
              className="px-4 py-3 text-left text-red-600"
            >
              Logout
            </button>
          </nav>
        </div>
      )}

      {/* Page content */}
      <main className="max-w-md mx-auto p-4">{children}</main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
