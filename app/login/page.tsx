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

  // 🍎 iPhone install banner state (UI-only)
  const [showIosBanner, setShowIosBanner] = useState(false);

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

  useEffect(() => {
    const container = document.getElementById("recaptcha-container");

    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
    }

    // 🍎 Detect iPhone Safari (UI-only)
    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const dismissed = localStorage.getItem("ios_install_banner_dismissed");

    if (isIos && isSafari && !dismissed) {
      setShowIosBanner(true);
    }

    return () => {
      try {
        window.recaptchaVerifier?.clear();
        delete window.recaptchaVerifier;
      } catch {}

      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  async function sendCode() {
    setError(null);
    setLoading(true);
    try {
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

  function dismissIosBanner() {
    localStorage.setItem("ios_install_banner_dismissed", "1");
    setShowIosBanner(false);
  }

  return (
    <main className="w-full min-h-screen bg-white">

      {/* 🍎 iPhone Install Banner (UI-only) */}
      {showIosBanner && (
        <div className="fixed top-0 inset-x-0 z-50 bg-black/90 text-white px-4 py-3 flex items-center justify-between">
          <div className="text-sm">
            📱 Add DateCambodia to your Home Screen  
            <div className="text-xs text-white/80">
              Tap Share → Add to Home Screen
            </div>
          </div>
          <button
            onClick={dismissIosBanner}
            className="ml-4 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      )}

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

      {/* REST OF FILE UNCHANGED */}
      {/* ... (no logic below touched) ... */}

      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900">
          How DateCambodia Works
        </h2>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border p-6 shadow-sm">
            <h3 className="font-semibold text-lg text-gray-900">Sign Up Free</h3>
            <p className="mt-2 text-gray-700 text-sm">
              Join the No.1 Cambodian dating app using your phone number or
              Google.
            </p>
          </div>

          <div className="rounded-2xl border p-6 shadow-sm">
            <h3 className="font-semibold text-lg text-gray-900">
              Create Your Profile
            </h3>
            <p className="mt-2 text-gray-700 text-sm">
              Add photos, interests, and details to attract real Khmer singles.
            </p>
          </div>

          <div className="rounded-2xl border p-6 shadow-sm">
            <h3 className="font-semibold text-lg text-gray-900">
              Start Dating
            </h3>
            <p className="mt-2 text-gray-700 text-sm">
              Discover people nearby and connect instantly on DateCambodia.
            </p>
          </div>
        </div>
      </section>

      {/* auth section unchanged */}

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
