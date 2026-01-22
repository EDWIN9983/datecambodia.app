"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
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
        // ❌ DO NOT CREATE USER HERE
        // ✅ User will be created ONLY after onboarding is completed
        router.replace("/profile-setup");
        return;
      }

      const data = snap.data();

      // 3️⃣ Banned user
      if (data.isBanned) {
        router.replace("/banned");
        return;
      }

      // 4️⃣ Update last active (safe, only for real users)
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
