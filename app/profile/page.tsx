"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import PageShell from "@/components/PageShell";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

const CAMBODIA_CITIES = [
  "Phnom Penh","Siem Reap","Battambang","Sihanoukville","Kampong Cham",
  "Kampong Thom","Kampot","Kep","Takeo","Kandal","Prey Veng","Svay Rieng",
  "Pursat","Banteay Meanchey","Oddar Meanchey","Ratanakiri","Mondulkiri",
  "Kratie","Stung Treng","Koh Kong","Pailin","Tbong Khmum",
];

const INTERESTS = [
  "Music","Travel","Coffee","Food","Movies","Fitness","Nightlife","Gaming",
  "Nature","Business","Art","Sports","Pets","Photography","Cooking","Reading",
];

export default function EditProfilePage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        router.replace("/profile-setup");
        return;
      }

      const data = snap.data();
      setUid(user.uid);
      setName(data.name || "");
      setCity(data.city || "");
      setBio(data.bio || "");
      setInterests(data.interests || []);
      setPhotos(data.photos || []);
    });

    return () => unsub();
  }, [router]);

  function toggleInterest(label: string) {
    setInterests((prev) => {
      if (prev.includes(label)) return prev.filter((i) => i !== label);
      if (prev.length >= 10) return prev;
      return [...prev, label];
    });
  }

  async function uploadPhoto(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: form }
    );

    if (!res.ok) throw new Error("Photo upload failed");
    const data = await res.json();
    setPhotos((p) => [...p, data.secure_url]);
  }

  async function save() {
    if (!uid) return;
    if (!name.trim()) return setError("Name is required");
    if (!city) return setError("City is required");
    if (!bio.trim()) return setError("Bio is required");

    setLoading(true);
    setError("");

    try {
      await updateDoc(doc(db, "users", uid), {
        name: name.trim(),
        city,
        bio: bio.trim(),
        interests,
        photos,
        lastActive: serverTimestamp(),
      });

      router.replace("/profile");
    } catch (e: any) {
      setError(e?.message || "Failed to save profile");
    }

    setLoading(false);
  }

  if (!uid) return null;

  return (
    <PageShell title="Edit Profile">
      <div className="mx-auto w-full max-w-md app-card rounded-xl p-6 shadow">
        <h1 className="text-xl font-semibold mb-4 text-center app-text">
          Edit Profile
        </h1>

        {/* Photos */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {photos.map((p) => (
            <img
              key={p}
              src={p}
              className="h-20 w-20 rounded object-cover"
            />
          ))}
        </div>

        <label className="cursor-pointer mb-4 inline-block app-primary text-center py-2 px-4 rounded font-medium">
          Add photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && uploadPhoto(e.target.files[0])}
          />
        </label>

        <input
          className="w-full app-input mb-3"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
          className="w-full app-input mb-3"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Select city</option>
          {CAMBODIA_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <textarea
          className="w-full app-input mb-3"
          rows={3}
          placeholder="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        <div className="mb-4">
          <div className="text-sm font-semibold mb-2 app-text">
            Interests (max 10)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {INTERESTS.map((i) => (
              <label key={i} className="flex items-center gap-2 text-sm app-text">
                <input
                  type="checkbox"
                  checked={interests.includes(i)}
                  onChange={() => toggleInterest(i)}
                />
                {i}
              </label>
            ))}
          </div>
        </div>

        {error && <div className="text-sm app-primary mb-3">{error}</div>}

        <button
          onClick={save}
          disabled={loading}
          className="w-full app-primary py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </PageShell>
  );
}
