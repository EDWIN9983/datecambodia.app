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

const INTEREST_CATEGORIES = [
  {
    key: "social",
    label: "☕ Social & Casual",
    options: ["Coffee", "Drinks", "Beer", "Cocktails", "Late night", "Chill"],
  },
  {
    key: "activities",
    label: "🌆 Activities",
    options: ["Night market", "Riverside", "Rooftop", "City walk", "Party", "Live music"],
  },
  {
    key: "relax",
    label: "🏖️ Relax & Escape",
    options: ["Beach", "Sunset", "Pool", "Staycation", "Weekend trip"],
  },
  {
    key: "indoors",
    label: "🎬 Indoors",
    options: ["Netflix", "Movies", "Gaming", "Music", "Karaoke"],
  },
  {
    key: "vibe",
    label: "🔥 Vibe / Energy",
    options: ["Flirty", "Chill vibe", "Fun", "Spontaneous", "Private", "Easygoing"],
  },
  {
    key: "availability",
    label: "⏰ Availability",
    options: ["Tonight", "Late night only", "Weekends", "Short stay", "Just visiting"],
  },
  {
    key: "background",
    label: "🌍 Background",
    options: ["Local", "Expat", "Traveler", "Digital nomad"],
  },
  {
    key: "preferences",
    label: "🚫 Preferences",
    options: ["No drama", "No pressure", "Discreet", "Respectful", "Good vibes"],
  },
];

export default function EditProfilePage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
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
      setCity(data.city || "");
      setBio(data.bio || "");
      setInterests(data.interests || []);
      setPhotos(data.photos || []);
    });

    return () => unsub();
  }, [router]);

  function toggleInterest(label: string) {
    setInterests((prev) =>
      prev.includes(label)
        ? prev.filter((i) => i !== label)
        : [...prev, label].slice(0, 25)
    );
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
    setPhotos((p) => [...p, data.secure_url].slice(0, 5));
  }

  function setAsProfilePhoto(url: string) {
    setPhotos((prev) => {
      const rest = prev.filter((p) => p !== url);
      return [url, ...rest];
    });
  }

  async function save() {
    if (!uid) return;
    if (!city) return setError("City is required");
    if (!bio.trim()) return setError("Bio is required");

    setLoading(true);
    setError("");

    try {
      await updateDoc(doc(db, "users", uid), {
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
      <div className="mx-auto w-full max-w-md app-card rounded-xl p-6 shadow space-y-5">
        <h1 className="text-xl font-semibold text-center app-text">
          Edit Profile
        </h1>

        <div className="flex gap-2 flex-wrap">
          {photos.map((p) => (
            <div key={p} className="relative">
              <img src={p} className="h-20 w-20 rounded object-cover" />
              {photos[0] !== p && (
                <button
                  onClick={() => setAsProfilePhoto(p)}
                  className="absolute bottom-1 right-1 text-xs bg-black/60 text-white rounded px-1"
                >
                  Set
                </button>
              )}
            </div>
          ))}
        </div>

        <label className="cursor-pointer inline-block app-primary text-center py-2 px-4 rounded font-medium">
          Add photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && uploadPhoto(e.target.files[0])}
          />
        </label>

        <select
          className="w-full app-input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Select city</option>
          {CAMBODIA_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <textarea
          className="w-full app-input"
          rows={3}
          placeholder="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        <div className="space-y-3">
          <div className="text-sm font-semibold app-text">
            What I’m into right now
          </div>

          {INTEREST_CATEGORIES.map((cat) => (
            <div key={cat.key} className="app-card rounded-lg">
              <button
                type="button"
                onClick={() =>
                  setOpenCategory(openCategory === cat.key ? null : cat.key)
                }
                className="w-full px-3 py-2 text-left font-medium app-text flex justify-between"
              >
                {cat.label}
                <span>{openCategory === cat.key ? "−" : "+"}</span>
              </button>

              {openCategory === cat.key && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                  {cat.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm app-text">
                      <input
                        type="checkbox"
                        checked={interests.includes(opt)}
                        onChange={() => toggleInterest(opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <div className="text-sm app-primary">{error}</div>}

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
