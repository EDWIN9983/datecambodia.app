"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("+855");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [confirm, setConfirm] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hearts = useMemo(
    () => [
      { left: "10%", size: 14, delay: "0s" },
      { left: "22%", size: 18, delay: "1.5s" },
      { left: "35%", size: 16, delay: "3s" },
      { left: "48%", size: 14, delay: "2s" },
      { left: "62%", size: 20, delay: "4s" },
      { left: "75%", size: 16, delay: "1s" },
      { left: "88%", size: 18, delay: "2.5s" },
    ],
    []
  );

  // Do NOT init Recaptcha here (prevents Next.js crash)
  useEffect(() => {
    return () => {
      try {
        window.recaptchaVerifier?.clear();
        delete window.recaptchaVerifier;
      } catch {}
    };
  }, []);

  async function sendCode() {
    setError(null);
    setLoading(true);

    try {
      // Lazy init (Firebase + Next.js safe)
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new (RecaptchaVerifier as any)(
          "recaptcha-container",
          { size: "invisible" },
          auth
        );
      }

      const verifier = window.recaptchaVerifier!;
      const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirm(confirmation);
      setStep("code");
    } catch (e: any) {
      setError(e?.message || "Failed to send verification code");
    }

    setLoading(false);
  }

  async function verifyCode() {
    if (!confirm) return;
    setError(null);
    setLoading(true);

    try {
      await confirm.confirm(code);

      try {
        window.recaptchaVerifier?.clear();
        delete window.recaptchaVerifier;
      } catch {}

      router.replace("/auth-redirect");
    } catch (e: any) {
      setError(e?.message || "Invalid verification code");
    }

    setLoading(false);
  }

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);

      try {
        window.recaptchaVerifier?.clear();
        delete window.recaptchaVerifier;
      } catch {}

      router.replace("/auth-redirect");
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed");
    }

    setLoading(false);
  }

  async function signInWithFacebook() {
    return;
  }

  return (
    <main className="w-full min-h-screen bg-white">
      <section
        className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: "url('/hero-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-pink-700/80 via-rose-600/70 to-black/80" />

        <div className="absolute inset-0 pointer-events-none">
          {hearts.map((h, i) => (
            <span
              key={i}
              className="hero-heart"
              style={{
                left: h.left,
                width: `${h.size}px`,
                height: `${h.size}px`,
                animationDelay: h.delay,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 px-6 text-center max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            DateCambodia — No.1 Cambodian Dating App ❤️
          </h1>

          <p className="mt-4 text-base md:text-lg text-white/95">
            Meet real Khmer singles on the most trusted Cambodian dating website.
            Chat, match, and date genuine people near you.
          </p>

          <p className="mt-3 text-sm md:text-base text-white/90">
            DateCambodia.app is the No.1 Khmer dating platform for dating in
            Cambodia. Find love, fun, and real relationships with Cambodian women
            and men today.
          </p>

          <a
            href="#auth"
            className="inline-flex mt-8 rounded-full bg-white px-8 py-3 text-base font-semibold text-pink-600 shadow-lg hover:scale-105 transition"
          >
            Start Dating Now
          </a>
        </div>
      </section>

      <section id="auth" className="px-6 pb-20">
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl border bg-white p-6 shadow-lg">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-extrabold text-gray-900">
                Join DateCambodia
              </h2>
              <p className="text-sm text-gray-700 mt-1">
                Sign in to continue
              </p>
            </div>

            {step === "phone" ? (
              <div className="space-y-4">
                <label className="text-sm font-semibold text-gray-800">
                  Phone number
                </label>

                <input
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+85512345678"
                />

                <button
                  onClick={sendCode}
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 text-white font-bold shadow-md hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Continue with Phone"}
                </button>

                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs font-semibold text-gray-600">
                      OR
                    </span>
                  </div>
                </div>

                <button
                  onClick={signInWithGoogle}
                  disabled={loading}
                  className="w-full rounded-2xl border border-gray-300 py-3 font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Continue with Google
                </button>

                <button
                  type="button"
                  disabled
                  className="w-full rounded-2xl border border-gray-300 py-3 font-semibold text-gray-400 cursor-not-allowed"
                  title="Facebook login coming soon"
                >
                  Continue with Facebook (Coming Soon)
                </button>

                <p className="text-xs text-gray-600 text-center">
                  By continuing, you confirm you are 18+
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="text-sm font-semibold text-gray-800">
                  Verification code
                </label>

                <input
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                />

                <button
                  onClick={verifyCode}
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 text-white font-bold shadow-md hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div id="recaptcha-container" />
          </div>
        </div>
      </section>

      <style jsx global>{`
        .hero-heart {
          position: absolute;
          bottom: -40px;
          background: rgba(255, 255, 255, 0.9);
          transform: rotate(-45deg);
          animation: float 9s infinite ease-in;
        }

        .hero-heart::before,
        .hero-heart::after {
          content: "";
          position: absolute;
          width: 50%;
          height: 50%;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 9999px;
        }

        .hero-heart::before {
          top: 0;
          left: 0;
        }

        .hero-heart::after {
          top: 0;
          right: 0;
        }

        @keyframes float {
          0% {
            transform: translateY(0) rotate(-45deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(-110vh) rotate(-45deg);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}
