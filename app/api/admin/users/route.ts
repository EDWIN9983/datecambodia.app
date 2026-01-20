export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

type UserDoc = {
  uid: string;
  name?: string;
  publicId?: string;
  gender?: string;
  phone?: string;
  phoneVerified?: boolean;
  city?: string;
  isBanned?: boolean;
  likesCount?: number;
  createdAt?: Timestamp;
  lastActive?: Timestamp;
  coinBUntil?: Timestamp;
  coinsA?: number;
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, adminPassword } = body;

  if (adminPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ======================= STATS ======================= */
  if (action === "stats") {
    const usersCol = db.collection("users");

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const totalUsers = (await usersCol.count().get()).data().count;

    const newToday = (
      await usersCol.where("createdAt", ">=", startOfToday).count().get()
    ).data().count;

    const activeToday = (
      await usersCol.where("lastActive", ">=", startOfToday).count().get()
    ).data().count;

    const premiumUsers = (
      await usersCol.where("coinBUntil", ">", now).count().get()
    ).data().count;

    let totalLikes = 0;
    const usersSnap = await usersCol.get();
    usersSnap.forEach((d) => {
      if (typeof d.data().likesCount === "number") {
        totalLikes += d.data().likesCount;
      }
    });

    const acceptedDates = (
      await db
        .collection("dateRequests")
        .where("respondedAt", "!=", null)
        .count()
        .get()
    ).data().count;

    return NextResponse.json({
      totalUsers,
      newToday,
      activeToday,
      premiumUsers,
      totalLikes,
      acceptedDates,
    });
  }

  /* ======================= USER LIST ======================= */
  if (action === "list") {
    const {
      premium,
      gender,
      hasPhone,
      banned,
      newJoin,
      verified,
      city,
      limit = 50,
      searchQuery,
    } = body;

    const snap = await db.collection("users").get();

    let users: UserDoc[] = snap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as Omit<UserDoc, "uid">),
    }));

    if (searchQuery && typeof searchQuery === "string") {
      const q = searchQuery.trim().toLowerCase();
      users = users.filter(
        (u) =>
          u.uid.toLowerCase().includes(q) ||
          (u.name || "").toLowerCase().includes(q) ||
          (u.publicId || "").toLowerCase().includes(q.replace("#", ""))
      );
    }

    if (typeof banned === "boolean") {
      users = users.filter((u) => (u.isBanned === true) === banned);
    }

    if (gender) {
      users = users.filter((u) => u.gender === gender);
    }

    if (typeof hasPhone === "boolean") {
      users = hasPhone
        ? users.filter(
            (u) => typeof u.phone === "string" && u.phone.trim() !== ""
          )
        : users.filter((u) => !u.phone || u.phone.trim() === "");
    }

    if (typeof verified === "boolean") {
      users = users.filter((u) => (u.phoneVerified === true) === verified);
    }

    if (newJoin) {
      const now = new Date();
      const from =
        newJoin === "today"
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
          : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      users = users.filter((u) => {
        const created =
          u.createdAt?.toDate?.() ||
          u.lastActive?.toDate?.() ||
          null;

        return created && created >= from;
      });
    }

    if (typeof premium === "boolean") {
      const now = new Date();
      users = users.filter((u) =>
        premium
          ? u.coinBUntil && u.coinBUntil.toDate() > now
          : !u.coinBUntil || u.coinBUntil.toDate() <= now
      );
    }

    if (city && typeof city === "string") {
      const c = city.trim().toLowerCase();
      users = users.filter(
        (u) =>
          typeof u.city === "string" &&
          u.city.trim().toLowerCase() === c
      );
    }

    users = users.slice(0, limit);

    return NextResponse.json({ users });
  }

  /* ======================= SEARCH ======================= */
  if (action === "search") {
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ users: [] });
    }

    let snap;

    if (query.startsWith("#")) {
      snap = await db
        .collection("users")
        .where("publicId", "==", query.replace("#", ""))
        .limit(1)
        .get();
    } else {
      snap = await db
        .collection("users")
        .where("name", "==", query)
        .limit(10)
        .get();
    }

    const users: UserDoc[] = snap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as Omit<UserDoc, "uid">),
    }));

    return NextResponse.json({ users });
  }

  /* ======================= PREMIUM ======================= */
  if (action === "premium") {
    const { uid, until } = body;

    await db.collection("users").doc(uid).update({
      coinBUntil: Timestamp.fromDate(new Date(until)),
      lastActive: Timestamp.now(),
    });

    // 🔔 FIXED notification schema
    await db.collection("notifications").add({
      toUid: uid,
      type: "premium",
      until: Timestamp.fromDate(new Date(until)),
      title: "Premium Activated",
      message: "Your Premium is now active ❤️",
      read: false,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ ok: true });
  }

  /* ======================= COINS ======================= */
  if (action === "coins") {
    const { uid, coins } = body;

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const current = Number(snap.data()?.coinsA || 0);
    const next = current + Number(coins || 0);

    await userRef.update({
      coinsA: next,
      lastActive: Timestamp.now(),
    });

    // 🔔 FIXED notification schema
    await db.collection("notifications").add({
      toUid: uid,
      type: "coins",
      amount: Number(coins),
      title: "Coins Received",
      message: `You received ${coins} pulses 🎉`,
      read: false,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ ok: true });
  }

  /* ======================= BAN ======================= */
  if (action === "ban") {
    const { uid, ban } = body;
    if (!uid || typeof ban !== "boolean") {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    await db.collection("users").doc(uid).update({
      isBanned: ban,
      lastActive: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  }

  /* ======================= UPDATE ======================= */
  if (action === "update") {
    const { uid, updates } = body;
    if (!uid || !updates) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    await db.collection("users").doc(uid).update({
      ...updates,
      lastActive: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
