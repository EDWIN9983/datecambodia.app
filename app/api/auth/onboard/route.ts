import { NextResponse } from "next/server";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, userData } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    // 🔹 Load admin defaults
    const defaultsSnap = await getDoc(doc(db, "adminConfig", "defaults"));
    const defaults = defaultsSnap.exists() ? defaultsSnap.data() : {};

    const coinsA = Number(defaults.coinsA) || 0;
    const dailyLikeCount = Number(defaults.dailyLikeCount) || 0;
    const dailyDateCount = Number(defaults.dailyDateCount) || 0;
    const defaultPremiumDays = Number(defaults.defaultPremiumDays) || 0;

    let coinBUntil = null;
    if (defaultPremiumDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + defaultPremiumDays);
      coinBUntil = Timestamp.fromDate(d);
    }

    await setDoc(
      doc(db, "users", uid),
      {
        uid,
        ...userData,
        coinsA,
        dailyLikeCount,
        dailyDateCount,
        coinBUntil,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to onboard user" }, { status: 500 });
  }
}
