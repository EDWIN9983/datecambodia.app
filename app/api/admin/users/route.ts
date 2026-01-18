import { NextRequest, NextResponse } from "next/server";
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

const db = getFirestore();

type UserDoc = {
  uid: string;
  name?: string;
  publicId?: string;
  gender?: string;
  phone?: string;
  isBanned?: boolean;
  isPremium?: boolean;
  likesCount?: number;
  createdAt?: Timestamp;
  lastActive?: Timestamp;
  coinBUntil?: Timestamp;
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
    usersSnap.forEach(d => {
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
      limit = 50,
    } = body;

    let q = db.collection("users") as FirebaseFirestore.Query;

    if (typeof banned === "boolean") {
      q = q.where("isBanned", "==", banned);
    }

    if (gender) {
      q = q.where("gender", "==", gender);
    }

    if (typeof hasPhone === "boolean") {
      q = hasPhone
        ? q.where("phone", "!=", "")
        : q.where("phone", "==", "");
    }

    if (verified === true) {
      q = q.where("phoneVerified", "==", true);
    }

    if (newJoin) {
      const now = new Date();
      const from =
        newJoin === "today"
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
          : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      q = q.where("createdAt", ">=", from);
    }

    const snap = await q.limit(limit).get();

    let users: UserDoc[] = snap.docs.map(d => ({
      uid: d.id,
      ...(d.data() as Omit<UserDoc, "uid">),
    }));

    if (typeof premium === "boolean") {
      const now = new Date();
      users = users.filter(u =>
        premium
          ? u.coinBUntil && u.coinBUntil.toDate() > now
          : !u.coinBUntil || u.coinBUntil.toDate() <= now
      );
    }

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

    const users: UserDoc[] = snap.docs.map(d => ({
      uid: d.id,
      ...(d.data() as Omit<UserDoc, "uid">),
    }));

    return NextResponse.json({ users });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
