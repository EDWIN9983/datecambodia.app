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
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  title?: string;
  children: ReactNode;
  stickyMenu?: ReactNode;
};

export default function PageShell({ title, children, stickyMenu }: Props) {
  const [open, setOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [search, setSearch] = useState("");

  const [hasLikeNotif, setHasLikeNotif] = useState(false);
  const [hasSystemNotif, setHasSystemNotif] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setShowSearchModal(false);
    setSearch("");
    setOpen(false);
  }, [pathname]);

  async function logout() {
    await signOut(auth);
    window.location.href = "/login";
  }

  /* -----------------------------
     LIKE + DATE NOTIFICATIONS ONLY
  ------------------------------*/
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

  const hasAnyNotif = hasLikeNotif || hasSystemNotif;

  /* -----------------------------
     SEARCH BY PUBLIC ID
     (NO COIN / PREMIUM CHECK)
  ------------------------------*/
  async function runSearch() {
    const v = search.trim();
    if (!/^#(\d{5}|[A-Z]{3}\d{6})$/.test(v)) return;

    try {
      const q = query(
        collection(db, "users"),
        where("publicId", "==", v),
        limit(1)
      );

      const snap = await getDocs(q);
      if (snap.empty) return;

      setShowSearchModal(false);
      setSearch("");

      router.push(`/u/${snap.docs[0].id}`);
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* HEADER */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{title}</h1>

          <div className="flex items-center gap-4">
            {/* SEARCH ICON */}
            <button
              type="button"
              onClick={() => {
                router.push("/discover");
                setShowSearchModal(true);
              }}
              className="text-xl"
            >
              🔍
            </button>

            {/* NOTIFICATIONS */}
            <Link href="/activity" className="relative text-sm font-semibold">
              ❤️
              {hasAnyNotif && (
                <span className="ml-1 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                  NEW
                </span>
              )}
            </Link>

            {/* MENU */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-xl"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {stickyMenu}

      {/* SEARCH MODAL (DISCOVER ONLY) */}
      {showSearchModal && pathname === "/discover" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="app-card w-[90%] max-w-sm rounded-2xl p-4">
            <div className="text-sm font-semibold mb-2 app-text">
              Search User by ID
            </div>

            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
              placeholder="e.g. #00012"
              className="w-full app-input mb-3"
            />

            <div className="flex gap-2">
              <button
                onClick={runSearch}
                className="flex-1 app-primary rounded-xl py-2 font-semibold"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearch("");
                }}
                className="flex-1 app-card rounded-xl py-2 font-semibold app-text"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HAMBURGER MENU */}
      {open && (
        <div className="fixed top-14 right-4 z-50 w-48 rounded-xl border bg-white shadow">
          <nav className="flex flex-col divide-y text-sm">
            <Link
              href="/profile"
              className="px-4 py-3"
              onClick={() => setOpen(false)}
            >
              Profile
            </Link>
            <Link
              href="/store"
              className="px-4 py-3"
              onClick={() => setOpen(false)}
            >
              Store
            </Link>
            <Link
              href="/settings"
              className="px-4 py-3"
              onClick={() => setOpen(false)}
            >
              Settings
            </Link>
            <Link
              href="/contact"
              className="px-4 py-3"
              onClick={() => setOpen(false)}
            >
              Contact Us
            </Link>
            <Link
              href="/legal"
              className="px-4 py-3"
              onClick={() => setOpen(false)}
            >
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

      <main className="max-w-md mx-auto p-4">{children}</main>
      <BottomNav />
    </div>
  );
}
