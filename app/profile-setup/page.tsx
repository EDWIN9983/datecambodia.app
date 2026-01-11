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
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

const NATIONALITIES = [
    "Cambodian", "Thai", "Vietnamese", "Chinese", "Korean", "Japanese", "Indian",
    "Filipino", "Malaysian", "Singaporean", "Indonesian", "Australian",
    "French", "German", "British", "American", "Canadian", "Other",
];

const CAMBODIA_CITIES = [
    "Phnom Penh", "Siem Reap", "Battambang", "Sihanoukville", "Kampong Cham",
    "Kampong Thom", "Kampot", "Kep", "Takeo", "Kandal", "Prey Veng", "Svay Rieng",
    "Pursat", "Banteay Meanchey", "Oddar Meanchey", "Ratanakiri", "Mondulkiri",
    "Kratie", "Stung Treng", "Koh Kong", "Pailin", "Tbong Khmum",
];

const INTERESTS = [
    "Music", "Travel", "Coffee", "Food", "Movies", "Fitness", "Nightlife", "Gaming",
    "Nature", "Business", "Art", "Sports", "Pets", "Shopping", "Photography",
    "Cooking", "Reading", "Karaoke", "Beach", "Hiking",
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

function padId(n: number) {
    return `#${String(n).padStart(5, "0")}`;
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
    const [interests, setInterests] = useState<string[]>([]);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [ageConfirmed, setAgeConfirmed] = useState(false);

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
        if (interests.length < 1) return false;
        if (!ageConfirmed) return false;
        return true;
    }, [uid, name, dob, age, nationality, city, photoFile, bio, interests, ageConfirmed]);

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

    function toggleInterest(label: string) {
        setInterests((prev) =>
            prev.includes(label)
                ? prev.filter((x) => x !== label)
                : [...prev, label].slice(0, 10)
        );
    }

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
            const nameLower = name.trim().toLowerCase();

            const q = query(
                collection(db, "users"),
                where("nameLower", "==", nameLower)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                setError("This name is already taken");
                setLoading(false);
                return;
            }

            const publicId = await runTransaction(db, async (tx) => {
                const counterRef = doc(db, "counters", "users");
                const counterSnap = await tx.get(counterRef);
                const last = counterSnap.exists()
                    ? counterSnap.data().last || 0
                    : 0;
                const next = last + 1;
                tx.set(counterRef, { last: next }, { merge: true });
                return padId(next);
            });

            const photoUrl = await uploadPhoto(photoFile!);

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
                    interests,
                    photos: [photoUrl],
                    isAdmin: false,
                    isPremium: false,
                    isBanned: false,
                    dailyDateCount: 0,
                    lastReset: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    lastActive: serverTimestamp(),
                },
                { merge: true }
            );

            router.replace("/home");
        } catch (e: any) {
            setError(e?.message || "Failed to save profile");
        }

        setLoading(false);
    }

    if (!uid) return null;

    return (
        <div className="min-h-screen flex items-center justify-center px-4 app-card">
            <div className="w-full max-w-md app-card rounded-xl p-6 shadow">
                <h1 className="text-xl font-semibold mb-4 text-center app-text">
                    Create Your Profile
                </h1>

                <div className="flex flex-col items-center mb-4">
                    <div className="h-28 w-28 rounded-full app-card overflow-hidden flex items-center justify-center mb-2">
                        {photoFile ? (
                            <img src={URL.createObjectURL(photoFile)} className="h-full w-full object-cover" />
                        ) : (
                            <span className="app-muted text-sm">Photo</span>
                        )}
                    </div>

                    <label className="cursor-pointer mb-3 app-primary text-center py-2 px-4 rounded font-medium">
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
                    className="w-full app-input mb-3"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <input
                    type="date"
                    max={maxAdultDate()}
                    className="w-full app-input mb-2"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                />

                {dob && <div className="text-xs app-muted mb-3">Age: {age}</div>}

                <select
                    className="w-full app-input mb-3"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                >
                    <option value="">Select nationality</option>
                    {NATIONALITIES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>

                <select
                    className="w-full app-input mb-3"
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
                        className="w-full app-input"
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                    >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>

                    <select
                        className="w-full app-input"
                        value={lookingFor}
                        onChange={(e) => setLookingFor(e.target.value as any)}
                    >
                        <option value="men">Looking for Men</option>
                        <option value="women">Looking for Women</option>
                        <option value="everyone">Looking for Everyone</option>
                    </select>
                </div>

                <textarea
                    className="w-full app-input mb-3"
                    placeholder="Bio"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                />

                <div className="mb-3">
                    <div className="text-sm font-semibold mb-2 app-text">
                        Interests (max 10)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {INTERESTS.map((label) => (
                            <label key={label} className="flex items-center gap-2 text-sm app-text">
                                <input
                                    type="checkbox"
                                    checked={interests.includes(label)}
                                    onChange={() => toggleInterest(label)}
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                </div>

                <label className="flex items-center gap-2 mb-3 text-sm app-text">
                    <input
                        type="checkbox"
                        checked={ageConfirmed}
                        onChange={(e) => setAgeConfirmed(e.target.checked)}
                    />
                    I confirm I am 18+
                </label>

                {error && <div className="mb-3 text-sm app-primary">{error}</div>}

                <button
                    onClick={saveProfile}
                    disabled={loading || !canSave}
                    className="w-full app-primary py-3 rounded-lg font-semibold disabled:opacity-50"
                >
                    {loading ? "Saving..." : "Save & Continue"}
                </button>
            </div>
        </div>
    );
}
