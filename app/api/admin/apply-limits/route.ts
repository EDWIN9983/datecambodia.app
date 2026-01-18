// FILE 1 — CREATE NEW FILE
// app/api/admin/apply-limits/route.ts

import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminDb = getFirestore();

export async function POST(req: Request) {
  const body = await req.json();
  const { adminPassword, scope, limits } = body;

  if (adminPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const usersSnap = await adminDb.collection("users").get();
  const batch = adminDb.batch();
  const now = Timestamp.now();

  usersSnap.forEach((doc) => {
    const data = doc.data();
    const isPremium = data.coinBUntil && data.coinBUntil.toMillis() > now.toMillis();

    if (scope === "all") {
      batch.update(doc.ref, {
        dailyLikeCount: limits.dailyLikeCount,
        dailyDateCount: limits.dailyDateCount,
      });
    }

    if (scope === "premium" && isPremium) {
      batch.update(doc.ref, {
        dailyLikeCount: limits.premiumDailyLikeCount,
        dailyDateCount: limits.premiumDailyDateCount,
      });
    }

    if (scope === "nonPremium" && !isPremium) {
      batch.update(doc.ref, {
        dailyLikeCount: limits.dailyLikeCount,
        dailyDateCount: limits.dailyDateCount,
      });
    }
  });

  await batch.commit();
  return NextResponse.json({ ok: true });
}
