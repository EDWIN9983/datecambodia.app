import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { adminPassword, action, search, updates, uid, banned } = body;

  if (adminPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    return unauthorized();
  }

  /* ======================
     🔍 SEARCH USER
     ====================== */
  if (action === "search") {
    let userDoc: any = null;

    const byUid = await db.collection("users").doc(search).get();
    if (byUid.exists) {
      userDoc = { uid: byUid.id, ...byUid.data() };
    }

    if (!userDoc) {
      const snap = await db
        .collection("users")
        .where("publicId", "==", search)
        .limit(1)
        .get();

      if (!snap.empty) {
        const d = snap.docs[0];
        userDoc = { uid: d.id, ...d.data() };
      }
    }

    if (!userDoc) {
      const snap = await db
        .collection("users")
        .where("name", "==", search)
        .limit(1)
        .get();

      if (!snap.empty) {
        const d = snap.docs[0];
        userDoc = { uid: d.id, ...d.data() };
      }
    }

    if (!userDoc) {
      const chat = await db.collection("chats").doc(search).get();
      if (chat.exists) {
        const users = chat.data()?.users || [];
        if (users[0]) {
          const u = await db.collection("users").doc(users[0]).get();
          if (u.exists) {
            userDoc = { uid: u.id, ...u.data() };
          }
        }
      }
    }

    return NextResponse.json({ user: userDoc });
  }

  /* ======================
     ✏️ UPDATE USER
     ====================== */
  if (action === "update") {
    if (!uid || !updates) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    await db.collection("users").doc(uid).update(updates);
    return NextResponse.json({ success: true });
  }

  /* ======================
     🚫 BAN / UNBAN USER
     ====================== */
  if (action === "ban") {
    if (!uid || typeof banned !== "boolean") {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    await db.collection("users").doc(uid).update({
      isBanned: banned,
    });

    return NextResponse.json({ success: true });
  }

  /* ======================
     ⭐ PREMIUM (coinBUntil)
     ====================== */
  if (action === "premium") {
    const { uid, until } = body;
    if (!uid || !until) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    await db.collection("users").doc(uid).update({
      coinBUntil: new Date(until),
    });

    return NextResponse.json({ success: true });
  }

  /* ======================
     🪙 ADD COINS
     ====================== */
  if (action === "coins") {
    const { uid, coins } = body;
    if (!uid || typeof coins !== "number") {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    await db.collection("users").doc(uid).update({
      coinsA: coins,
    });

    return NextResponse.json({ success: true });
  }

  /* ======================
     📋 LIST USERS WITH FILTERS (READ-ONLY)
     ====================== */
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

    let q: FirebaseFirestore.Query = db.collection("users");

    if (typeof banned === "boolean") q = q.where("isBanned", "==", banned);
    if (gender) q = q.where("gender", "==", gender);
    if (typeof hasPhone === "boolean") {
      q = hasPhone ? q.where("phone", "!=", "") : q.where("phone", "==", "");
    }
    if (typeof verified === "boolean") q = q.where("isVerified", "==", verified);

    if (newJoin) {
      const now = new Date();
      let from = new Date();
      if (newJoin === "today") {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
      if (newJoin === "7d") {
        from.setDate(now.getDate() - 7);
      }
      q = q.where("createdAt", ">=", from);
    }

    const snap = await q.limit(limit).get();
    let users = snap.docs.map(d => ({ uid: d.id, ...d.data() })) as any[];

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

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
