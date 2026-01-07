"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      // 1️⃣ Not logged in → login
      if (!user) {
        router.replace("/login");
        return;
      }

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      // 2️⃣ User document does NOT exist → profile setup
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          phone: user.phoneNumber || "",
          isAdmin: false,
          isPremium: false,
          isBanned: false,
          dailyDateCount: 0,
          lastReset: new Date().toISOString().slice(0, 10),
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        });

        router.replace("/profile-setup");
        return;
      }

      const data = snap.data();

      // 3️⃣ Banned user
      if (data.isBanned) {
        router.replace("/banned");
        return;
      }

      // 4️⃣ Update last active
      await updateDoc(ref, {
        lastActive: serverTimestamp(),
      });

      // 5️⃣ Normal flow → home
      router.replace("/home");
    });

    return () => unsub();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 text-sm">Checking your account…</p>
    </div>
  );
}
