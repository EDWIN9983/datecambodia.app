"use client";

import PageShell from "@/components/PageShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  PhoneAuthProvider,
  linkWithPopup,
  unlink,
  updatePhoneNumber,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getBlockedUserIds, unblockUser } from "@/lib/firestore";

type SettingsUser = {
  uid: string;
  name?: string;
  nameLower?: string;
  publicId?: string;
  phone?: string;
  createdAt?: any;
  isPremium?: boolean;

  // Settings v1
  hideLastSeen?: boolean;
  hideCountry?: boolean;

  // One-time change
  usernameChangeUsed?: boolean;

  // Deactivate
  isDeactivated?: boolean;
  deactivatedAt?: any;
};

type BlockedView = {
  uid: string;
  name?: string;
  publicId?: string;
};

function maskPhone(p?: string) {
  if (!p) return "";
  if (p.length <= 6) return p;
  return `${p.slice(0, 4)}****${p.slice(-2)}`;
}

function isGoogleLinked(user: any) {
  const arr = user?.providerData || [];
  return arr.some((p: any) => p?.providerId === "google.com");
}

export default function SettingsPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [me, setMe] = useState<SettingsUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  // Privacy toggles
  const [hideLastSeen, setHideLastSeen] = useState(false);
  const [hideCountry, setHideCountry] = useState(false);

  // Name (one-time)
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Google link
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  // Phone change flow
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const [phoneStage, setPhoneStage] = useState<"idle" | "code">("idle");
  const [newPhone, setNewPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [sendingSms, setSendingSms] = useState(false);
  const [verifyingSms, setVerifyingSms] = useState(false);

  // Danger zone
  const [deactivating, setDeactivating] = useState(false);

  // Blocked users
  const [blocked, setBlocked] = useState<string[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);

  // ✅ ONLY ADDITION: resolved display data (Name + Public ID)
  const [blockedView, setBlockedView] = useState<BlockedView[]>([]);

  const authedUser = auth.currentUser;
  const googleLinked = useMemo(
    () => isGoogleLinked(authedUser),
    [authedUser?.uid, authedUser?.providerData]
  );

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

      const data = snap.data() as SettingsUser;

      setUid(user.uid);
      setMe(data);

      setHideLastSeen(!!data.hideLastSeen);
      setHideCountry(!!data.hideCountry);

      setNewName(data.name || "");
      setLoading(false);

      const ids = await getBlockedUserIds(user.uid);
      setBlocked(ids);
    });

    return () => unsub();
  }, [router]);

  // ✅ ONLY ADDITION: resolve blocked uid -> {name, publicId} for display
  useEffect(() => {
    async function resolveBlocked() {
      if (!blocked || blocked.length === 0) {
        setBlockedView([]);
        return;
      }

      try {
        const snaps = await Promise.all(
          blocked.map(async (id) => {
            try {
              const s = await getDoc(doc(db, "users", id));
              if (!s.exists()) return { uid: id } as BlockedView;
              const d: any = s.data();
              return { uid: id, name: d?.name, publicId: d?.publicId } as BlockedView;
            } catch {
              return { uid: id } as BlockedView;
            }
          })
        );

        setBlockedView(snaps);
      } catch {
        setBlockedView(blocked.map((id) => ({ uid: id })));
      }
    }

    resolveBlocked();
  }, [blocked]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  async function savePrivacy() {
    if (!uid) return;
    setSavingPrivacy(true);

    try {
      await updateDoc(doc(db, "users", uid), {
        hideLastSeen,
        hideCountry,
      });

      setMe((prev) =>
        prev
          ? {
              ...prev,
              hideLastSeen,
              hideCountry,
            }
          : prev
      );

      setToast("Saved");
    } catch (e: any) {
      setToast(e?.message || "Failed to save");
    }

    setSavingPrivacy(false);
  }

  async function saveNameOnce() {
    if (!uid || !me) return;
    if (me.usernameChangeUsed) {
      setToast("Name change already used");
      return;
    }

    const v = newName.trim();
    if (!v) return setToast("Enter a name");

    setSavingName(true);

    try {
      await updateDoc(doc(db, "users", uid), {
        name: v,
        nameLower: v.toLowerCase(),
        usernameChangeUsed: true,
        lastActive: serverTimestamp(),
      });

      setMe((prev) =>
        prev
          ? {
              ...prev,
              name: v,
              nameLower: v.toLowerCase(),
              usernameChangeUsed: true,
            }
          : prev
      );

      setToast("Name updated");
    } catch (e: any) {
      setToast(e?.message || "Failed to update name");
    }

    setSavingName(false);
  }

  async function linkGoogle() {
    const user = auth.currentUser;
    if (!user || !uid) return;

    setLinkingGoogle(true);

    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(user, provider);

      const email = auth.currentUser?.email || null;
      if (email) {
        await updateDoc(doc(db, "users", uid), { email });
      }

      setToast("Google linked");
    } catch (e: any) {
      setToast(e?.message || "Failed to link Google");
    }

    setLinkingGoogle(false);
  }

  async function switchGoogle() {
    const user = auth.currentUser;
    if (!user || !uid) return;

    setLinkingGoogle(true);

    try {
      if (isGoogleLinked(user)) {
        await unlink(user, "google.com");
      }

      const provider = new GoogleAuthProvider();
      await linkWithPopup(user, provider);

      const email = auth.currentUser?.email || null;
      if (email) {
        await updateDoc(doc(db, "users", uid), { email });
      }

      setToast("Google updated");
    } catch (e: any) {
      setToast(e?.message || "Failed to update Google");
    }

    setLinkingGoogle(false);
  }

  function ensureRecaptcha() {
    if (recaptchaRef.current) return recaptchaRef.current;

    // @ts-ignore
    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });

    return recaptchaRef.current;
  }

  async function sendPhoneCode() {
    const user = auth.currentUser;
    if (!user || !uid) return;

    const phone = newPhone.trim();
    if (!phone) return setToast("Enter phone");

    setSendingSms(true);

    try {
      const verifier = ensureRecaptcha();

      const provider = new PhoneAuthProvider(auth);
      const vid = await provider.verifyPhoneNumber(phone, verifier);

      setVerificationId(vid);
      setPhoneStage("code");
      setToast("Code sent");
    } catch (e: any) {
      setToast(e?.message || "Failed to send code");
    }

    setSendingSms(false);
  }

  async function confirmPhoneCode() {
    const user = auth.currentUser;
    if (!user || !uid) return;

    if (!verificationId) return setToast("Request code first");
    const code = smsCode.trim();
    if (!code) return setToast("Enter code");

    setVerifyingSms(true);

    try {
      const cred = PhoneAuthProvider.credential(verificationId, code);
      await updatePhoneNumber(user, cred);

      const updated = user.phoneNumber || newPhone.trim();

      await updateDoc(doc(db, "users", uid), {
        phone: updated,
      });

      setMe((prev) =>
        prev
          ? {
              ...prev,
              phone: updated,
            }
          : prev
      );

      setNewPhone("");
      setSmsCode("");
      setVerificationId(null);
      setPhoneStage("idle");

      setToast("Phone updated");
    } catch (e: any) {
      setToast(e?.message || "Failed to update phone");
    }

    setVerifyingSms(false);
  }

  async function deactivateAccount() {
    if (!uid) return;

    setDeactivating(true);

    try {
      await updateDoc(doc(db, "users", uid), {
        isDeactivated: true,
        deactivatedAt: serverTimestamp(),
      });

      await signOut(auth);
      window.location.href = "/login";
    } catch (e: any) {
      setToast(e?.message || "Failed to deactivate");
      setDeactivating(false);
    }
  }

  if (loading || !uid || !me) return null;

  const createdText = me.createdAt?.toDate
    ? me.createdAt.toDate().toLocaleDateString()
    : "";

  return (
    <PageShell title="Settings">
      <div className="space-y-4">
        {/* ACCOUNT INFO */}
        <div className="app-card rounded-2xl p-4 space-y-2">
          <div className="text-sm font-semibold app-text">Account Info</div>

          <div className="text-sm app-muted">
            <div>
              <span className="font-medium app-text">User ID:</span> {uid}
            </div>
            {me.publicId && (
              <div>
                <span className="font-medium app-text">Public ID:</span>{" "}
                {me.publicId}
              </div>
            )}
            {me.name && (
              <div>
                <span className="font-medium app-text">Name:</span> {me.name}
              </div>
            )}
            {createdText && (
              <div>
                <span className="font-medium app-text">Created:</span>{" "}
                {createdText}
              </div>
            )}
          </div>
        </div>

        {/* PHONE */}
        <div className="app-card rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold app-text">Phone Number</div>

          <div className="text-sm app-muted">
            Current:{" "}
            <span className="app-text font-medium">
              {maskPhone(me.phone || auth.currentUser?.phoneNumber || "") ||
                "Not set"}
            </span>
          </div>

          {phoneStage === "idle" ? (
            <div className="space-y-2">
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="New phone (e.g. +855...)"
                className="w-full app-input"
              />

              <button
                onClick={sendPhoneCode}
                disabled={sendingSms}
                className="w-full app-primary rounded-xl py-2 font-semibold disabled:opacity-50"
              >
                {sendingSms ? "Sending..." : "Send verification code"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
                placeholder="Enter SMS code"
                className="w-full app-input"
              />

              <div className="flex gap-2">
                <button
                  onClick={confirmPhoneCode}
                  disabled={verifyingSms}
                  className="flex-1 app-primary rounded-xl py-2 font-semibold disabled:opacity-50"
                >
                  {verifyingSms ? "Verifying..." : "Confirm & update"}
                </button>

                <button
                  onClick={() => {
                    setPhoneStage("idle");
                    setSmsCode("");
                    setVerificationId(null);
                  }}
                  className="flex-1 app-card rounded-xl py-2 font-semibold app-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Needed for Firebase Recaptcha */}
          <div id="recaptcha-container" />
        </div>

        {/* GMAIL / GOOGLE */}
        <div className="app-card rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold app-text">Gmail (Google)</div>

          <div className="text-sm app-muted">
            Status:{" "}
            <span className="app-text font-medium">
              {googleLinked
                ? `Linked (${auth.currentUser?.email || "email"})`
                : "Not linked"}
            </span>
          </div>

          {!googleLinked ? (
            <button
              onClick={linkGoogle}
              disabled={linkingGoogle}
              className="w-full app-primary rounded-xl py-2 font-semibold disabled:opacity-50"
            >
              {linkingGoogle ? "Linking..." : "Link Google"}
            </button>
          ) : (
            <button
              onClick={switchGoogle}
              disabled={linkingGoogle}
              className="w-full app-card rounded-xl py-2 font-semibold app-text"
            >
              {linkingGoogle ? "Updating..." : "Change Google account"}
            </button>
          )}
        </div>

        {/* PRIVACY */}
        <div className="app-card rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold app-text">Privacy</div>

          <label className="flex items-center justify-between text-sm app-text">
            <span>Hide last seen</span>
            <input
              type="checkbox"
              checked={hideLastSeen}
              onChange={(e) => setHideLastSeen(e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between text-sm app-text">
            <span>Hide country</span>
            <input
              type="checkbox"
              checked={hideCountry}
              onChange={(e) => setHideCountry(e.target.checked)}
            />
          </label>

          <button
            onClick={savePrivacy}
            disabled={savingPrivacy}
            className="w-full app-primary rounded-xl py-2 font-semibold disabled:opacity-50"
          >
            {savingPrivacy ? "Saving..." : "Save privacy"}
          </button>

          <div className="text-xs app-muted">
            (This only saves your preference. It does not change other pages
            yet.)
          </div>
        </div>

        {/* ONE-TIME NAME CHANGE */}
        <div className="app-card rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold app-text">
            Name Change (One-time)
          </div>

          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New name"
            className="w-full app-input"
            disabled={!!me.usernameChangeUsed}
          />

          <button
            onClick={saveNameOnce}
            disabled={savingName || !!me.usernameChangeUsed}
            className="w-full app-primary rounded-xl py-2 font-semibold disabled:opacity-50"
          >
            {me.usernameChangeUsed
              ? "Already used"
              : savingName
              ? "Updating..."
              : "Update name"}
          </button>

          <div className="text-xs app-muted">
            This is one-time and does not create any public history.
          </div>
        </div>

        {/* BLOCKED USERS */}
        <div className="app-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold app-text">Blocked users</div>

            <button
              onClick={() => setShowBlocked((v) => !v)}
              className="text-xs font-semibold app-text"
            >
              {showBlocked ? "Hide" : `View (${blocked.length})`}
            </button>
          </div>

          {showBlocked && (
            blockedView.length === 0 ? (
              <div className="text-sm app-muted">No blocked users</div>
            ) : (
              blockedView.map((u) => (
                <div key={u.uid} className="flex justify-between items-center">
                  <span className="text-sm app-text">
                    {u.name ? u.name : "User"}
                    {u.publicId ? ` (${u.publicId})` : ""}
                  </span>

                  <button
                    onClick={async () => {
                      await unblockUser(uid!, u.uid);
                      setBlocked((b) => b.filter((x) => x !== u.uid));
                    }}
                    className="text-xs text-red-500 font-semibold"
                  >
                    Unblock
                  </button>
                </div>
              ))
            )
          )}
        </div>

        {/* DANGER ZONE */}
        <div className="app-card rounded-2xl p-4 space-y-3 border border-red-200">
          <div className="text-sm font-semibold text-red-600">Danger Zone</div>

          <div className="text-sm app-muted">
            Deactivate account (temporary). You can add re-activate flow later.
          </div>

          <button
            onClick={deactivateAccount}
            disabled={deactivating}
            className="w-full rounded-xl py-2 font-semibold text-white bg-red-600 disabled:opacity-50"
          >
            {deactivating ? "Deactivating..." : "Deactivate"}
          </button>
        </div>

        {toast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 app-card rounded-full px-4 py-2 text-sm app-text shadow">
            {toast}
          </div>
        )}
      </div>
    </PageShell>
  );
}
