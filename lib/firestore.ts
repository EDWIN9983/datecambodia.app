// lib/firestore.ts
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
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

// =========================
// TYPES
// =========================
export type UserDoc = {
  uid: string;
  name?: string;
  city?: string;
  lookingFor?: string;
  gender?: string;
  photos?: string[];
  isAdmin?: boolean;
  isPremium?: boolean;
  dailyDateCount?: number;
  dailyLikeCount?: number;
  lastReset?: any;
  lastLikeReset?: any;
  lastDiscoverReset?: any;
  viewedToday?: string[];
  isBanned?: boolean;
};

// =========================
// GET USER PROFILE
// =========================
export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

// =========================
// CREATE USER PROFILE
// =========================
export async function createUserDoc(data: UserDoc) {
  const ref = doc(db, "users", data.uid);
  await setDoc(ref, data);
}

// =========================
// DISCOVER USERS
// =========================
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

// =========================
// LIKE USER
// =========================
export async function likeUser(fromUid: string, toUid: string) {
  await addDoc(collection(db, "likes"), {
    fromUser: fromUid,
    toUser: toUid,
    createdAt: serverTimestamp(),
  });

  await incrementDailyLike(fromUid);
}

// =========================
// DATE REQUEST (FIXED)
// =========================
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
  const a = fromUser.uid;
  const b = toUserId;

  const forwardId = `${a}_${b}`;
  const reverseId = `${b}_${a}`;

  const forwardRef = doc(db, "dateRequests", forwardId);
  const reverseRef = doc(db, "dateRequests", reverseId);

  const [forwardSnap, reverseSnap] = await Promise.all([
    getDoc(forwardRef),
    getDoc(reverseRef),
  ]);

  if (forwardSnap.exists()) {
    const d = forwardSnap.data() as any;
    if (d.status === "pending" || d.status === "accepted") {
      throw new Error("DATE_REQUEST_EXISTS");
    }
  }

  if (reverseSnap.exists()) {
    const d = reverseSnap.data() as any;
    if (d.status === "pending" || d.status === "accepted") {
      throw new Error("REVERSE_DATE_REQUEST_EXISTS");
    }
  }

  await setDoc(forwardRef, {
    fromUser: a,
    toUser: b,
    date,
    time,
    place,
    placeId,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  const userRef = doc(db, "users", a);
  await updateDoc(userRef, {
    dailyDateCount: (fromUser.dailyDateCount || 0) + 1,
    lastReset: serverTimestamp(),
  });
}

// =========================
// UPDATE USER PHOTO
// =========================
export async function updateUserPhoto(photoUrl: string) {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  await updateDoc(ref, {
    photos: [photoUrl],
  });
}

// =========================
// VIEW TRACKING
// =========================
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

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

// =========================
// DAILY LIKE COUNTER
// =========================
export async function incrementDailyLike(uid: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as any;
  const now = new Date();

  let count = data.dailyLikeCount || 0;
  const last = data.lastLikeReset?.toDate?.();

  if (!last || !isSameDay(last, now)) {
    count = 0;
  }

  await updateDoc(ref, {
    dailyLikeCount: count + 1,
    lastLikeReset: serverTimestamp(),
  });
}

// ======================================================
// 🔒 BLOCK LOGIC (v1) — ADDED (NO EXISTING CODE TOUCHED)
// ======================================================

// Block user
export async function blockUser(fromUid: string, toUid: string) {
  await setDoc(doc(db, "blocks", `${fromUid}_${toUid}`), {
    fromUid,
    toUid,
    createdAt: new Date(),
  });
}

// Unblock user
export async function unblockUser(fromUid: string, toUid: string) {
  await deleteDoc(doc(db, "blocks", `${fromUid}_${toUid}`));
}

// Get blocked user IDs
export async function getBlockedUserIds(uid: string): Promise<string[]> {
  const q = query(
    collection(db, "blocks"),
    where("fromUid", "==", uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().toUid);
}
