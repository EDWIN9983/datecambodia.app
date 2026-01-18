// FILE 2 — REPLACE FULLY
// app/admin/components/DefaultsPanel.tsx

"use client";

import { useEffect, useState } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-5 bg-white shadow-sm">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function DefaultsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // NEW USER DEFAULTS
  const [defaultCoinsA, setDefaultCoinsA] = useState(0);
  const [defaultPremiumDays, setDefaultPremiumDays] = useState(0);
  const [defaultDailyLikeCount, setDefaultDailyLikeCount] = useState(0);
  const [defaultDailyDateCount, setDefaultDailyDateCount] = useState(0);

  // DAILY LIMITS
  const [dailyLikeCount, setDailyLikeCount] = useState(0);
  const [dailyDateCount, setDailyDateCount] = useState(0);
  const [premiumDailyLikeCount, setPremiumDailyLikeCount] = useState(0);
  const [premiumDailyDateCount, setPremiumDailyDateCount] = useState(0);

  async function loadDefaults() {
    const res = await fetch("/api/admin/defaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get",
        adminPassword: process.env.NEXT_PUBLIC_ADMIN_PASSWORD,
      }),
    });

    const text = await res.text();
    if (text) {
      const data = JSON.parse(text);
      if (data?.defaults) {
        setDefaultCoinsA(Number(data.defaults.defaultCoinsA) || 0);
        setDefaultPremiumDays(Number(data.defaults.defaultPremiumDays) || 0);
        setDefaultDailyLikeCount(Number(data.defaults.defaultDailyLikeCount) || 0);
        setDefaultDailyDateCount(Number(data.defaults.defaultDailyDateCount) || 0);

        setDailyLikeCount(Number(data.defaults.dailyLikeCount) || 0);
        setDailyDateCount(Number(data.defaults.dailyDateCount) || 0);
        setPremiumDailyLikeCount(Number(data.defaults.premiumDailyLikeCount) || 0);
        setPremiumDailyDateCount(Number(data.defaults.premiumDailyDateCount) || 0);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDefaults();
  }, []);

  async function saveDefaults() {
    setSaving(true);
    await fetch("/api/admin/defaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set",
        adminPassword: process.env.NEXT_PUBLIC_ADMIN_PASSWORD,
        data: {
          defaultCoinsA,
          defaultPremiumDays,
          defaultDailyLikeCount,
          defaultDailyDateCount,
          dailyLikeCount,
          dailyDateCount,
          premiumDailyLikeCount,
          premiumDailyDateCount,
        },
      }),
    });
    setSaving(false);
  }

  if (loading) {
    return (
      <Section title="New User Defaults & Limits">
        <div className="text-sm text-gray-500">Loading…</div>
      </Section>
    );
  }

  return (
    <Section title="New User Defaults & Limits">
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-gray-500">Signup Coins A</label>
          <input className="rounded-xl border p-2 text-sm w-full" type="number" value={defaultCoinsA} onChange={(e) => setDefaultCoinsA(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Signup Premium Days</label>
          <input className="rounded-xl border p-2 text-sm w-full" type="number" value={defaultPremiumDays} onChange={(e) => setDefaultPremiumDays(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Signup Likes</label>
          <input className="rounded-xl border p-2 text-sm w-full" type="number" value={defaultDailyLikeCount} onChange={(e) => setDefaultDailyLikeCount(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Signup Dates</label>
          <input className="rounded-xl border p-2 text-sm w-full" type="number" value={defaultDailyDateCount} onChange={(e) => setDefaultDailyDateCount(Number(e.target.value))} />
        </div>

        <div>
          <label className="text-xs text-gray-500">Daily Likes (All)</label>
          <input className="rounded-xl border p-2 text-sm w-full" type="number" value={dailyLikeCount} onChange={(e) => setDailyLikeCount(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Daily Dates (All)</label>
          <input className="rounded-xl border p-2 text-sm w-full" type="number" value={dailyDateCount} onChange={(e) => setDailyDateCount(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Daily Likes (Premium)</label>
          <input className="rounded-xl border p-2 text-sm w-full" type="number" value={premiumDailyLikeCount} onChange={(e) => setPremiumDailyLikeCount(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Daily Dates (Premium)</label>
          <input className="rounded-xl border p-2 text-sm w-full" type="number" value={premiumDailyDateCount} onChange={(e) => setPremiumDailyDateCount(Number(e.target.value))} />
        </div>
      </div>

      <div className="flex justify-end mt-3">
        <button onClick={saveDefaults} disabled={saving} className="rounded-xl border px-4 py-2 text-sm font-semibold">
          Save
        </button>
      </div>
    </Section>
  );
}
