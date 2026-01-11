"use client";

import { useRef } from "react";
import PageShell from "@/components/PageShell";

export default function LegalPage() {
  // Refs for each section
  const privacyRef = useRef<HTMLElement | null>(null);
  const termsRef = useRef<HTMLElement | null>(null);
  const safetyRef = useRef<HTMLElement | null>(null);
  const guidelinesRef = useRef<HTMLElement | null>(null);
  const aboutRef = useRef<HTMLElement | null>(null);
  const contactRef = useRef<HTMLElement | null>(null);

  // Scroll helper with header + sticky menu offset
  function scrollTo(ref: React.RefObject<HTMLElement | null>) {
    if (!ref.current) return;
    const headerHeight = 56;
    const stickyHeight = 48;
    const y =
      ref.current.getBoundingClientRect().top +
      window.scrollY -
      (headerHeight + stickyHeight + 8);
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  const stickyMenu = (
    <div className="sticky top-14 z-20 bg-white border-b py-2 px-4 flex flex-wrap gap-2 overflow-x-auto">
      <button onClick={() => scrollTo(privacyRef)} className="px-3 py-1 rounded bg-[var(--primary)] text-white text-xs font-medium">Privacy</button>
      <button onClick={() => scrollTo(termsRef)} className="px-3 py-1 rounded bg-[var(--primary)] text-white text-xs font-medium">Terms</button>
      <button onClick={() => scrollTo(safetyRef)} className="px-3 py-1 rounded bg-[var(--primary)] text-white text-xs font-medium">Safety</button>
      <button onClick={() => scrollTo(guidelinesRef)} className="px-3 py-1 rounded bg-[var(--primary)] text-white text-xs font-medium">Guidelines</button>
      <button onClick={() => scrollTo(aboutRef)} className="px-3 py-1 rounded bg-[var(--primary)] text-white text-xs font-medium">About</button>
      <button onClick={() => scrollTo(contactRef)} className="px-3 py-1 rounded bg-[var(--primary)] text-white text-xs font-medium">Contact</button>
    </div>
  );

  return (
    <PageShell title="Info & Legal" stickyMenu={stickyMenu}>
      <main className="space-y-8 pb-20">
        <section ref={privacyRef}>
          <h1 className="text-xl font-semibold mb-4">Privacy Policy</h1>
          <p className="app-muted text-sm mb-3">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
          <p className="text-sm mb-2">
            We collect only the minimum data required to operate the service, including profile information you voluntarily provide.
          </p>
          <p className="text-sm">
            We do not sell your personal data to third parties.
          </p>
        </section>

        <section ref={termsRef}>
          <h1 className="text-xl font-semibold mb-4">Terms & Conditions</h1>
          <p className="text-sm mb-2">
            By using this service, you agree to follow our rules and comply with all applicable laws.
          </p>
          <p className="text-sm">
            Misuse, harassment, or illegal activities may result in account suspension or termination.
          </p>
        </section>

        <section ref={safetyRef}>
          <h1 className="text-xl font-semibold mb-4">Safety</h1>
          <p className="text-sm mb-2">
            Always meet new people in public places and inform someone you trust before going on a date.
          </p>
          <p className="text-sm">
            Report suspicious or abusive behavior immediately.
          </p>
        </section>

        <section ref={guidelinesRef}>
          <h1 className="text-xl font-semibold mb-4">Community Guidelines</h1>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Be respectful and honest</li>
            <li>No harassment or hate speech</li>
            <li>No fake profiles</li>
            <li>No illegal content</li>
          </ul>
        </section>

        <section ref={aboutRef}>
          <h1 className="text-xl font-semibold mb-4">About</h1>
          <p className="text-sm">
            This platform is designed to help people connect safely and meaningfully.
          </p>
        </section>

        <section ref={contactRef}>
          <h1 className="text-xl font-semibold mb-4">Contact</h1>
          <p className="text-sm">
            For support or inquiries, please contact us at:
          </p>
          <p className="text-sm font-semibold mt-2">
            support@example.com
          </p>
        </section>
      </main>
    </PageShell>
  );
}
