"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
  query,
  collection,
  where,
  getDocs,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

const NATIONALITIES = [
  "Cambodian","Thai","Vietnamese","Chinese","Korean","Japanese","Indian",
  "Filipino","Malaysian","Singaporean","Indonesian","Australian",
  "French","German","British","American","Canadian","Other",
];

const CAMBODIA_CITIES = [
  "Phnom Penh","Siem Reap","Battambang","Sihanoukville","Kampong Cham",
  "Kampong Thom","Kampot","Kep","Takeo","Kandal","Prey Veng","Svay Rieng",
  "Pursat","Banteay Meanchey","Oddar Meanchey","Ratanakiri","Mondulkiri",
  "Kratie","Stung Treng","Koh Kong","Pailin","Tbong Khmum",
];

function calcAge(dob: string) {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function maxAdultDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split("T")[0];
}

function generatePublicId(n: number) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const a = letters[Math.floor(Math.random() * 26)];
  const b = letters[Math.floor(Math.random() * 26)];
  const c = letters[Math.floor(Math.random() * 26)];
  return `#${a}${b}${c}${String(n).padStart(6, "0")}`;
}

async function getAdminDefaults() {
  try {
    const snap = await getDoc(doc(db, "adminConfig", "defaults"));
    if (!snap.exists()) {
      return {
        defaultCoinsA: 0,
        defaultPremiumDays: 0,
        defaultDailyLikeCount: 0,
        defaultDailyDateCount: 0,
      };
    }
    const d = snap.data();
    return {
      defaultCoinsA: Number(d.defaultCoinsA) || 0,
      defaultPremiumDays: Number(d.defaultPremiumDays) || 0,
      defaultDailyLikeCount: Number(d.defaultDailyLikeCount) || 0,
      defaultDailyDateCount: Number(d.defaultDailyDateCount) || 0,
    };
  } catch {
    return {
      defaultCoinsA: 0,
      defaultPremiumDays: 0,
      defaultDailyLikeCount: 0,
      defaultDailyDateCount: 0,
    };
  }
}

/* ===========================
   🔔 NOTIFICATION HELPERS
=========================== */

async function notifyCoins(uid: string, amount: number) {
  if (!amount || amount <= 0) return;

  await addDoc(collection(db, "notifications"), {
    toUid: uid,
    type: "coins",
    title: "Pulses Added 🎁",
    body: `You received ${amount} pulses.`,
    createdAt: serverTimestamp(),
    read: false,
  });
}

async function notifyPremium(uid: string, until: Timestamp) {
  if (!until) return;

  const end = until.toDate().toLocaleString();

  await addDoc(collection(db, "notifications"), {
    toUid: uid,
    type: "premium",
    title: "Premium Activated ❤️",
    body: `Your premium is active until ${end}.`,
    createdAt: serverTimestamp(),
    read: false,
  });
}

export default function ProfileSetupPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [lookingFor, setLookingFor] = useState<"men" | "women" | "everyone">("women");
  const [nationality, setNationality] = useState("");
  const [city, setCity] = useState("");

  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [installShortcut, setInstallShortcut] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const age = useMemo(() => (dob ? calcAge(dob) : 0), [dob]);

  const canSave = useMemo(() => {
    if (!uid) return false;
    if (!name.trim()) return false;
    if (!dob || age < 18) return false;
    if (!nationality) return false;
    if (!city) return false;
    if (!photoFile) return false;
    if (!bio.trim()) return false;
    if (!ageConfirmed) return false;
    return true;
  }, [uid, name, dob, age, nationality, city, photoFile, bio, ageConfirmed]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setPhone(user.phoneNumber || "");

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists() && snap.data().dob) {
        router.replace("/home");
        return;
      }

      setUid(user.uid);
    });

    return () => unsub();
  }, [router]);

  async function uploadPhoto(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: form }
    );

    if (!res.ok) throw new Error("Photo upload failed");
    const data = await res.json();
    return data.secure_url;
  }

  async function saveProfile() {
    if (!uid || !canSave) return;

    setLoading(true);
    setError("");

    try {
      const defaults = await getAdminDefaults();
      const nameLower = name.trim().toLowerCase();

      const q = query(collection(db, "users"), where("nameLower", "==", nameLower));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setError("This name is already taken");
        setLoading(false);
        return;
      }

      const publicId = await runTransaction(db, async (tx) => {
        const counterRef = doc(db, "counters", "users");
        const counterSnap = await tx.get(counterRef);
        const last = counterSnap.exists() ? counterSnap.data().last || 0 : 0;
        const next = last + 1;
        tx.set(counterRef, { last: next }, { merge: true });
        return generatePublicId(next);
      });

      const photoUrl = await uploadPhoto(photoFile!);

      let coinBUntil: Timestamp | null = null;
      if (defaults.defaultPremiumDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + defaults.defaultPremiumDays);
        coinBUntil = Timestamp.fromDate(d);
      }

      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          publicId,
          phone,
          name: name.trim(),
          nameLower,
          nationality,
          dob,
          gender,
          lookingFor,
          city,
          bio: bio.trim(),
          photos: [photoUrl],
          isAdmin: false,
          isPremium: !!coinBUntil,
          isBanned: false,
          coinsA: defaults.defaultCoinsA,
          dailyLikeCount: defaults.defaultDailyLikeCount,
          dailyDateCount: defaults.defaultDailyDateCount,
          coinBUntil,
          lastReset: serverTimestamp(),
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        },
        { merge: true }
      );

      // 🔔 NOTIFICATIONS (ONLY HERE, ONLY ON MUTATION)
      await notifyCoins(uid, defaults.defaultCoinsA);
      if (coinBUntil) await notifyPremium(uid, coinBUntil);

      if (installShortcut && (window as any).deferredPrompt) {
        (window as any).deferredPrompt.prompt();
      }

      await fetch("/api/signup-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });

      router.replace("/home");
    } catch (e: any) {
      setError(e?.message || "Failed to save profile");
    }

    setLoading(false);
  }

  if (!uid) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow">
        <h1 className="text-xl font-semibold mb-4 text-center">Create Your Profile</h1>

        <div className="flex flex-col items-center mb-4">
          <div className="h-28 w-28 rounded-full border border-gray-800 overflow-hidden mb-2">
            {photoFile ? (
              <img src={URL.createObjectURL(photoFile)} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">
                Photo
              </div>
            )}
          </div>

          <label className="cursor-pointer border border-gray-700 px-4 py-2 rounded-xl text-sm">
            Choose photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <input
          className="w-full border border-gray-700 rounded-xl px-3 py-2 mb-3 bg-gray-900"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="date"
          max={maxAdultDate()}
          className="w-full border border-gray-700 rounded-xl px-3 py-2 mb-2 bg-gray-900"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
        />

        {dob && <div className="text-xs text-gray-400 mb-3">Age: {age}</div>}

        <select
          className="w-full border border-gray-700 rounded-xl px-3 py-2 mb-3 bg-gray-900"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
        >
          <option value="">Select nationality</option>
          {NATIONALITIES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        <select
          className="w-full border border-gray-700 rounded-xl px-3 py-2 mb-3 bg-gray-900"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Select your city</option>
          {CAMBODIA_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <select
            className="border border-gray-700 rounded-xl px-3 py-2 bg-gray-900"
            value={gender}
            onChange={(e) => setGender(e.target.value as any)}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <select
            className="border border-gray-700 rounded-xl px-3 py-2 bg-gray-900"
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value as any)}
          >
            <option value="men">Looking for Men</option>
            <option value="women">Looking for Women</option>
            <option value="everyone">Looking for Everyone</option>
          </select>
        </div>

        <textarea
          className="w-full border border-gray-700 rounded-xl px-3 py-2 mb-3 bg-gray-900"
          placeholder="Bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        <label className="flex items-center gap-2 mb-3 text-sm">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
          />
          I confirm I am 18+
        </label>

        <label className="flex items-center gap-2 mb-3 text-sm">
          <input
            type="checkbox"
            checked={installShortcut}
            onChange={(e) => setInstallShortcut(e.target.checked)}
          />
          Add DateCambodia to my phone home screen
        </label>

        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}

        <button
          onClick={saveProfile}
          disabled={loading || !canSave}
          className="w-full border border-gray-700 rounded-xl px-4 py-3 font-semibold disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
