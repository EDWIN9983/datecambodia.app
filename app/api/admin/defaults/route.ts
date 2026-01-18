// FILE 1 — REPLACE FULLY
// app/api/admin/defaults/route.ts

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
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { action, adminPassword, data } = body || {};

  if (adminPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ref = adminDb.doc("adminConfig/defaults");

  if (action === "get") {
    const snap = await ref.get();
    return NextResponse.json({
      defaults: snap.exists ? snap.data() : null,
    });
  }

  if (action === "set") {
    await ref.set(
      {
        // NEW USER DEFAULTS (signup only)
        defaultCoinsA: Number(data.defaultCoinsA) || 0,
        defaultPremiumDays: Number(data.defaultPremiumDays) || 0,
        defaultDailyLikeCount: Number(data.defaultDailyLikeCount) || 0,
        defaultDailyDateCount: Number(data.defaultDailyDateCount) || 0,

        // DAILY LIMITS (ongoing)
        dailyLikeCount: Number(data.dailyLikeCount) || 0,
        dailyDateCount: Number(data.dailyDateCount) || 0,
        premiumDailyLikeCount: Number(data.premiumDailyLikeCount) || 0,
        premiumDailyDateCount: Number(data.premiumDailyDateCount) || 0,

        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
