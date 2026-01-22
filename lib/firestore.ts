import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  runTransaction,
  increment,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export type UserDoc = {
  uid: string;
  name?: string;
  city?: string;
  lookingFor?: string;
  gender?: string;
  photos?: string[];
  isAdmin?: boolean;
  isPremium?: boolean; // legacy UI-only
  dailyDateCount?: number; // SINGLE counter
  dailyLikeCount?: number; // SINGLE counter
  lastReset?: any;
  viewedToday?: string[];
  isBanned?: boolean;
  coinsA?: number;
  coinBUntil?: any;
};

async function writeNotification(toUid: string, data: any) {
  await addDoc(collection(db, "notifications"), {
    ...data,
    toUid,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

export async function createUserDoc(data: UserDoc) {
  const ref = doc(db, "users", data.uid);
  await setDoc(ref, data);

  await writeNotification(data.uid, {
    type: "system",
    title: "Welcome 🎉",
    body: "Welcome to DateCambodia! Enjoy your experience.",
  });

  if (typeof data.coinsA === "number" && data.coinsA > 0) {
    await writeNotification(data.uid, {
      type: "coins",
      title: "Bonus Coins",
      body: `You received ${data.coinsA} bonus coins.`,
      amount: data.coinsA,
    });
  }

  if (data.coinBUntil) {
    await writeNotification(data.uid, {
      type: "premium",
      title: "Premium Activated",
      body: "Your premium access is active.",
    });
  }
}

export async function listDiscoverUsers({
  currentUid,
}: {
  currentUid: string;
}) {
  const q = query(collection(db, "users"));
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => d.data() as UserDoc)
    .filter((u) => u.uid !== currentUid && !u.isBanned);
}

/* =========================
   DAILY RESET (CRITICAL)
========================= */

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function ensureDailyReset(tx: any, userRef: any, data: any) {
  const last = data.lastReset?.toDate?.()?.getTime() || 0;

  if (last >= startOfToday()) return;

  tx.update(userRef, {
    dailyLikeCount: 0,
    dailyDateCount: 0,
    lastReset: serverTimestamp(),
  });
}

/* =========================
   PREMIUM CHECK
========================= */

function isPremiumActive(user: any) {
  const until = user?.coinBUntil;
  if (!until) return false;
  if (typeof until?.toDate === "function") {
    return until.toDate().getTime() > Date.now();
  }
  return false;
}

/* =========================
   ADMIN LIMITS
========================= */

async function getAdminLimits() {
  const snap = await getDoc(doc(db, "adminConfig", "defaults"));
  if (!snap.exists()) {
    return {
      defaultDailyLikeCount: 10,
      premiumDailyLikeCount: 50,
      defaultDailyDateCount: 10,
      premiumDailyDateCount: 50,
    };
  }
  const d = snap.data();
  return {
    defaultDailyLikeCount: Number(d.defaultDailyLikeCount) || 10,
    premiumDailyLikeCount: Number(d.premiumDailyLikeCount) || 50,
    defaultDailyDateCount: Number(d.defaultDailyDateCount) || 10,
    premiumDailyDateCount: Number(d.premiumDailyDateCount) || 50,
  };
}

/* =========================
   LIKE (2-COUNTER MODEL)
========================= */

export async function likeUser(fromUid: string, toUid: string) {
  const limits = await getAdminLimits();

  await runTransaction(db, async (tx) => {
    const fromRef = doc(db, "users", fromUid);
    const toRef = doc(db, "users", toUid);

    const fromSnap = await tx.get(fromRef);
    const toSnap = await tx.get(toRef);

    if (!fromSnap.exists() || !toSnap.exists()) {
      throw new Error("MISSING_USER");
    }

    const from = fromSnap.data();

    // 🔥 FIX — reset first
    await ensureDailyReset(tx, fromRef, from);

    const used = from.dailyLikeCount || 0;
    const premium = isPremiumActive(from);

    const limit = premium
      ? limits.premiumDailyLikeCount
      : limits.defaultDailyLikeCount;

    if (used >= limit) {
      throw new Error("LIKE_LIMIT_REACHED");
    }

    tx.update(fromRef, { dailyLikeCount: increment(1) });
    tx.update(toRef, { likesCount: increment(1) });

    const likeRef = doc(collection(db, "likes"));
    tx.set(likeRef, {
      fromUser: fromUid,
      toUser: toUid,
      createdAt: serverTimestamp(),
    });
  });
}

/* =========================
   DATE REQUEST (2-COUNTER)
========================= */

export async function sendDateRequest({
  fromUser,
  toUserId,
  date,
  time,
  place,
  placeId,
}: {
  fromUser: UserDoc;
  toUserId: string;
  date: string;
  time: string;
  place: string;
  placeId: string;
}) {
  const limits = await getAdminLimits();

  await runTransaction(db, async (tx) => {
    const fromRef = doc(db, "users", fromUser.uid);
    const fromSnap = await tx.get(fromRef);
    if (!fromSnap.exists()) throw new Error("MISSING_USER");

    const data = fromSnap.data();

    // 🔥 FIX — reset first
    await ensureDailyReset(tx, fromRef, data);

    const used = data.dailyDateCount || 0;
    const premium = isPremiumActive(data);

    const limit = premium
      ? limits.premiumDailyDateCount
      : limits.defaultDailyDateCount;

    if (used >= limit) {
      throw new Error("DATE_LIMIT_REACHED");
    }

    const dupQ = query(
      collection(db, "dateRequests"),
      where("fromUser", "==", fromUser.uid),
      where("toUser", "==", toUserId)
    );

    const dupSnap = await getDocs(dupQ);
    const hasPending = dupSnap.docs.some(
      (d) => d.data().status === "pending"
    );

    if (hasPending) throw new Error("DUPLICATE");

    tx.update(fromRef, { dailyDateCount: increment(1) });

    const ref = doc(db, "dateRequests", `${fromUser.uid}_${toUserId}`);
    tx.set(ref, {
      fromUser: fromUser.uid,
      toUser: toUserId,
      date,
      time,
      place,
      placeId,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  });
}

/* =========================
   MISC
========================= */

export async function updateUserPhoto(photoUrl: string) {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  await updateDoc(ref, {
    photos: [photoUrl],
  });
}

export async function blockUser(fromUid: string, toUid: string) {
  await setDoc(doc(db, "blocks", `${fromUid}_${toUid}`), {
    fromUid,
    toUid,
    createdAt: new Date(),
  });
}

export async function unblockUser(fromUid: string, toUid: string) {
  await deleteDoc(doc(db, "blocks", `${fromUid}_${toUid}`));
}

export async function getBlockedUserIds(uid: string): Promise<string[]> {
  const q = query(collection(db, "blocks"), where("fromUid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().toUid);
}
/* ======================= VIEW TRACKING ======================= */
export async function markViewed(uid: string, viewedUid: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as any;
  const now = new Date();

  let viewedToday: string[] = data.viewedToday || [];
  const last = data.lastDiscoverReset?.toDate?.();

  if (!last || !isSameDay(last, now)) {
    viewedToday = [];
  }

  if (!viewedToday.includes(viewedUid)) {
    viewedToday.push(viewedUid);
  }

  await updateDoc(ref, {
    viewedToday,
    lastDiscoverReset: serverTimestamp(),
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

