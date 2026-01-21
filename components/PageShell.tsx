"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import BottomNav from "@/components/BottomNav";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, HeartPulse, AlignJustify } from "lucide-react";

type Props = {
  title?: string;
  children: ReactNode;
  stickyMenu?: ReactNode;
};

type NotificationDoc = {
  id: string;
  toUid: string;
  type: string;
  title: string;
  body: string;
  read?: boolean;
  createdAt?: any;
};

export default function PageShell({
  title,
  children,
  stickyMenu,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setSearch("");
    setOpen(false);
  }, [pathname]);

  async function logout() {
    await signOut(auth);
    window.location.href = "/login";
  }

  /* -----------------------------
     AUTH + LIVE NOTIFICATIONS
  ------------------------------*/
  useEffect(() => {
    let unsubNotif: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setNotifications([]);

      if (!u) return;

      const q = query(
        collection(db, "notifications"),
        where("toUid", "==", u.uid),
        orderBy("createdAt", "desc"),
        limit(30)
      );

      unsubNotif = onSnapshot(q, (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setNotifications(items);
      });
    });

    return () => {
      unsubAuth();
      if (unsubNotif) unsubNotif();
    };
  }, []);

  const hasAnyUnread = notifications.some((n) => n.read === false);

  /* -----------------------------
     SEARCH BY PUBLIC ID
  ------------------------------*/
  async function runSearch() {
    const v = search.trim();

    if (!/^#[A-Z]{3}\d{6}$/.test(v)) {
      alert("Invalid ID format. Use: #ABC12345");
      return;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("publicId", "==", v),
        limit(1)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        alert("User not found");
        return;
      }

      const userDoc = snap.docs[0];
      const uid = userDoc.id;

      setShowSearchModal(false);
      setSearch("");

      // 🔒 SAFE REDIRECT — PROFILE PAGE HANDLES ITS OWN LAYOUT
      router.push(`/u/${uid}`);
    } catch {
      alert("Search failed");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* HEADER */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          {/* LOGO */}
          <Link href="/home" className="flex items-center">
            <img
              src="/logo.svg"
              alt="DateCambodia"
              className="h-7 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-4">
            {/* Sexy Search — INSTANT POPUP */}
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="transition-transform hover:scale-110"
            >
              <Sparkles
                size={22}
                strokeWidth={2}
                className="text-pink-400 hover:text-pink-500 drop-shadow-[0_0_6px_rgba(236,72,153,0.7)]"
              />
            </button>

            {/* Sexy Likes */}
            <Link
              href="/activity"
              className="relative transition-transform hover:scale-110"
            >
              <HeartPulse
                size={22}
                strokeWidth={2}
                className="text-pink-400 hover:text-pink-500 drop-shadow-[0_0_6px_rgba(236,72,153,0.7)]"
              />
              {hasAnyUnread && (
                <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
              )}
            </Link>

            {/* Sexy Menu */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="transition-transform hover:scale-110"
            >
              <AlignJustify
                size={24}
                strokeWidth={2}
                className="text-pink-400 hover:text-pink-500 drop-shadow-[0_0_6px_rgba(236,72,153,0.7)]"
              />
            </button>
          </div>
        </div>
      </header>

      {stickyMenu}

      {/* SEARCH MODAL */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="app-card w-[90%] max-w-sm rounded-2xl p-4">
            <div className="text-sm font-semibold mb-2 app-text">
              Search User by ID
            </div>

            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="e.g. #ABC12345"
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
        <div className="fixed top-14 right-4 z-50 w-48 rounded-xl border bg-white shadow text-gray-900">
          <nav className="flex flex-col divide-y divide-gray-200 text-sm">
            <Link
              href="/store"
              className="px-4 py-3 hover:bg-gray-100 font-medium"
            >
              Store
            </Link>
            <Link
              href="/settings"
              className="px-4 py-3 hover:bg-gray-100 font-medium"
            >
              Settings
            </Link>
            <Link
              href="https://datecambodia.app/contact"
              className="px-4 py-3 hover:bg-gray-100 font-medium"
            >
              Contact
            </Link>
            <Link
              href="https://datecambodia.app/community"
              className="px-4 py-3 hover:bg-gray-100 font-medium"
            >
              Community
            </Link>
            <button
              onClick={logout}
              className="px-4 py-3 text-left text-red-600 hover:bg-red-50 font-semibold"
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
