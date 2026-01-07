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
} from "firebase/firestore";
import { db, auth } from "./firebase";

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
  lastReset?: any;
  isBanned?: boolean;
};

// =========================
// GET USER PROFILE
// =========================
export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return { uid, ...(snap.data() as UserDoc) };
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
    .map((d) => ({ uid: d.id, ...(d.data() as UserDoc) }))
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
// DATE REQUEST
// =========================
export async function sendDateRequest({
  fromUser,
  toUserId,
  date,
  time,
  place,
}: {
  fromUser: UserDoc;
  toUserId: string;
  date: string;
  time: string;
  place: string;
}) {
  await addDoc(collection(db, "dateRequests"), {
    fromUser: fromUser.uid,
    toUser: toUserId,
    date,
    time,
    place,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  // update daily counter
  const userRef = doc(db, "users", fromUser.uid);
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

