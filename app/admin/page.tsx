"use client";

import Link from "next/link";
import DefaultsPanel from "@/app/admin/components/DefaultsPanel";
import { useEffect, useState } from "react";

type UserDoc = {
  uid: string;
  name?: string;
  publicId?: string;
  gender?: string;
  phone?: string;
  isBanned?: boolean;
  coinBUntil?: any;
  coinsA?: number;
  isVerified?: boolean;
  likesCount?: number;
  city?: string;
};

type Stats = {
  totalUsers: number;
  newToday: number;
  activeToday: number;
  premiumUsers: number;
  totalLikes: number;
  acceptedDates: number;
};

const CITIES = [
  "Phnom Penh","Siem Reap","Battambang","Sihanoukville","Kampong Cham",
  "Kampong Thom","Kampot","Kep","Takeo","Kandal","Prey Veng","Svay Rieng",
  "Pursat","Banteay Meanchey","Oddar Meanchey","Ratanakiri","Mondulkiri",
  "Kratie","Stung Treng","Koh Kong","Pailin","Tbong Khmum",
];

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);

  const [filters, setFilters] = useState({
    premium: null as boolean | null,
    gender: null as "male" | "female" | null,
    hasPhone: null as boolean | null,
    banned: null as boolean | null,
    newJoin: null as "today" | "7d" | null,
    verified: null as boolean | null,
    city: "" as string,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [list, setList] = useState<UserDoc[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [editData, setEditData] = useState<Partial<UserDoc>>({});
  const [viewMoreOpen, setViewMoreOpen] = useState(false);

  const [premiumDays, setPremiumDays] = useState(7);
  const [coinsAmount, setCoinsAmount] = useState(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);

  function login() {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuthorized(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  function requireConfirm(action: () => void) {
    setPendingAction(() => action);
    setConfirmOpen(true);
  }

  async function api(action: string) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        adminPassword: password,
      }),
    });

    if (!res.ok) {
      console.error("Admin API error:", await res.text());
      return null;
    }

    return res.json();
  }

  async function loadList() {
    const hasFilter =
      searchQuery.trim() !== "" ||
      filters.premium !== null ||
      filters.gender ||
      filters.hasPhone !== null ||
      filters.banned !== null ||
      filters.newJoin ||
      filters.verified !== null ||
      filters.city;

    if (!hasFilter) {
      setList([]);
      setUserDoc(null);
      setSelectedUids([]);
      return;
    }

    setListLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list",
          ...filters,
          searchQuery,
          adminPassword: password,
        }),
      });

      const data = await res.json();

      setList(data.users || []);
      setUserDoc(null);
      setSelectedUids([]);
    } catch {
      setList([]);
      setUserDoc(null);
      setSelectedUids([]);
    }

    setListLoading(false);
  }

  async function applyPremium() {
    const targets =
      selectedUids.length > 0
        ? selectedUids
        : userDoc?.uid
        ? [userDoc.uid]
        : [];

    if (!targets.length) return;

    const until = new Date();
    until.setDate(until.getDate() + premiumDays);

    await Promise.all(
      targets.map((uid) =>
        fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "premium",
            uid,
            until,
            adminPassword: password,
          }),
        })
      )
    );

    if (userDoc?.uid && targets.includes(userDoc.uid)) {
      setUserDoc({ ...userDoc, coinBUntil: until });
    }
  }

  async function applyCoins() {
    const targets =
      selectedUids.length > 0
        ? selectedUids
        : userDoc?.uid
        ? [userDoc.uid]
        : [];

    if (!targets.length) return;

    await Promise.all(
      targets.map((uid) =>
        fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "coins",
            uid,
            coins: coinsAmount,
            adminPassword: password,
          }),
        })
      )
    );

    if (userDoc?.uid && targets.includes(userDoc.uid)) {
      setUserDoc({ ...userDoc, coinsA: coinsAmount });
    }
  }

  async function handleBanToggle(ban: boolean) {
    const targets =
      selectedUids.length > 0
        ? selectedUids
        : userDoc?.uid
        ? [userDoc.uid]
        : [];

    if (!targets.length) return;

    await Promise.all(
      targets.map((uid) =>
        fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ban",
            uid,
            ban,
            adminPassword: password,
          }),
        })
      )
    );

    if (userDoc?.uid && targets.includes(userDoc.uid)) {
      setUserDoc({ ...userDoc, isBanned: ban });
    }
  }

  async function applyEdit() {
    const targets =
      selectedUids.length > 0
        ? selectedUids
        : userDoc?.uid
        ? [userDoc.uid]
        : [];

    if (!targets.length || !editData) return;

    await Promise.all(
      targets.map((uid) =>
        fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            uid,
            updates: editData,
            adminPassword: password,
          }),
        })
      )
    );

    if (userDoc?.uid && targets.includes(userDoc.uid)) {
      setUserDoc({ ...userDoc, ...editData });
    }

    setEditData({});
  }

  useEffect(() => {
    if (!authorized) return;

    api("stats").then((data) => {
      if (data && typeof data.totalUsers === "number") {
        setStats(data);
      }
    });
  }, [authorized]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border app-card p-6 shadow-sm">
          <div className="text-lg font-semibold app-text">Admin Access</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4 w-full rounded-xl border app-input px-3 py-2 text-sm"
          />
          {error && (
            <div className="mt-2 text-xs text-red-600">
              Incorrect password
            </div>
          )}
          <button
            onClick={login}
            className="mt-4 w-full rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-6">

        <Section title="System Status">
          <div className="grid grid-cols-6 gap-3">
            <Stat label="Total Users" value={stats?.totalUsers} />
            <Stat label="New Users (Today)" value={stats?.newToday} />
            <Stat label="Active (Today)" value={stats?.activeToday} />
            <Stat label="Premium Users" value={stats?.premiumUsers} />
            <Stat label="Likes (Total)" value={stats?.totalLikes} />
            <Stat label="Dates Accepted" value={stats?.acceptedDates} />
          </div>
        </Section>

        <DefaultsPanel />
                <Section title="Admin Tools">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/admin/store-settings" className="rounded-xl border app-card p-4 text-sm font-semibold app-text hover:opacity-80 transition">Store Settings</Link>
            <Link href="/admin/promotions" className="rounded-xl border app-card p-4 text-sm font-semibold app-text hover:opacity-80 transition">Promotions</Link>
            <Link href="/admin/reports" className="rounded-xl border app-card p-4 text-sm font-semibold app-text hover:opacity-80 transition">User Reports</Link>
            <Link href="/admin/analytics" className="rounded-xl border app-card p-4 text-sm font-semibold app-text hover:opacity-80 transition">Analytics</Link>
            <Link href="/admin/notifications" className="rounded-xl border app-card p-4 text-sm font-semibold app-text hover:opacity-80 transition">Notifications</Link>
            <Link href="/admin/events" className="rounded-xl border app-card p-4 text-sm font-semibold app-text hover:opacity-80 transition">Events Manager</Link>
            <Link href="/admin/blog" className="rounded-xl border app-card p-4 text-sm font-semibold app-text hover:opacity-80 transition">Blog Manager</Link>
            <Link href="/admin/settings" className="rounded-xl border app-card p-4 text-sm font-semibold app-text hover:opacity-80 transition">App Settings</Link>
          </div>
        </Section>

        <Section title="User Filters (Read-only)">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search UID / Name / Public ID"
              className="flex-1 rounded-xl border app-input px-3 py-2 text-sm"
            />

            <button
              onClick={() => {
                setSearchQuery("");
                setFilters({
                  premium: null,
                  gender: null,
                  hasPhone: null,
                  banned: null,
                  newJoin: null,
                  verified: null,
                  city: "",
                });
                setList([]);
                setUserDoc(null);
                setSelectedUids([]);
              }}
              className="rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            <select
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  premium: e.target.value === "" ? null : e.target.value === "true",
                }))
              }
              className="rounded-xl border app-input p-2 text-sm"
            >
              <option value="">Premium</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>

            <select
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  gender:
                    e.target.value === "male" || e.target.value === "female"
                      ? e.target.value
                      : null,
                }))
              }
              className="rounded-xl border app-input p-2 text-sm"
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            <select
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  hasPhone: e.target.value === "" ? null : e.target.value === "true",
                }))
              }
              className="rounded-xl border app-input p-2 text-sm"
            >
              <option value="">Phone</option>
              <option value="true">Has</option>
              <option value="false">No</option>
            </select>

            <select
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  banned: e.target.value === "" ? null : e.target.value === "true",
                }))
              }
              className="rounded-xl border app-input p-2 text-sm"
            >
              <option value="">Status</option>
              <option value="false">Active</option>
              <option value="true">Banned</option>
            </select>

            <select
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  newJoin:
                    e.target.value === "7d" || e.target.value === "today"
                      ? e.target.value
                      : null,
                }))
              }
              className="rounded-xl border app-input p-2 text-sm"
            >
              <option value="">Joined</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
            </select>

            <select
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  city: e.target.value || "",
                }))
              }
              className="rounded-xl border app-input p-2 text-sm"
            >
              <option value="">City</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              onClick={loadList}
              className="rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              Apply
            </button>
          </div>
        </Section>

        <Section title="Users List">
          {listLoading && <div className="text-sm app-muted">Loading…</div>}

          {list.length > 0 && (
            <div className="mb-3 flex items-center gap-3">
              <button
                onClick={() => {
                  if (selectedUids.length === list.length) {
                    setSelectedUids([]);
                  } else {
                    setSelectedUids(list.map((u) => u.uid));
                  }
                }}
                className="rounded-xl border px-3 py-1 text-xs font-semibold"
              >
                {selectedUids.length === list.length
                  ? "Unselect All"
                  : "Select All"}
              </button>

              <div className="text-xs app-muted">
                Selected: {selectedUids.length}
              </div>
            </div>
          )}

          <div className="divide-y">
            {list.map((u) => {
              const selected = selectedUids.includes(u.uid);
              const active = userDoc?.uid === u.uid;

              return (
                <button
                  key={u.uid}
                  onClick={() => {
                    setUserDoc(u);

                    setSelectedUids((prev) =>
                      prev.includes(u.uid)
                        ? prev.filter((id) => id !== u.uid)
                        : [...prev, u.uid]
                    );
                  }}
                  className={`w-full text-left p-3 flex justify-between items-center transition
                    ${active ? "border border-white rounded-xl" : ""}
                    ${selected ? "bg-white/10" : "hover:bg-white/5"}
                  `}
                >
                  <div>
                    <div className="font-semibold app-text">
                      {u.name || "—"}{" "}
                      <span className="text-xs app-muted">
                        {u.publicId || ""}
                      </span>
                    </div>

                    <div className="text-xs app-muted">
                      {u.gender || "—"} · {u.phone ? "Has phone" : "No phone"} · {u.city || "—"}
                    </div>
                  </div>

                  {selected && (
                    <div className="text-green-400 text-lg font-bold">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {userDoc && (
          <Section title="User Actions">
            <div className="mt-3 space-y-3">
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => requireConfirm(() => handleBanToggle(true))}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Ban
                </button>

                <button
                  onClick={() => requireConfirm(() => handleBanToggle(false))}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Unban
                </button>

                <button
                  onClick={() => requireConfirm(applyEdit)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Apply Edit
                </button>

                <button
                  onClick={() => setViewMoreOpen(true)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  View More
                </button>
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={premiumDays}
                  onChange={(e) => setPremiumDays(Number(e.target.value))}
                  className="w-24 rounded-xl border app-input px-2 py-1 text-sm"
                />
                <button
                  onClick={() => requireConfirm(applyPremium)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Grant Premium (days)
                </button>
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={coinsAmount}
                  onChange={(e) => setCoinsAmount(Number(e.target.value))}
                  className="w-24 rounded-xl border app-input px-2 py-1 text-sm"
                />
                <button
                  onClick={() => requireConfirm(applyCoins)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Set Coins
                </button>
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={editData.name || ""}
                  onChange={(e) =>
                    setEditData((d) => ({
                      ...d,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Edit Name"
                  className="rounded-xl border app-input px-2 py-1 text-sm"
                />
              </div>
            </div>
          </Section>
        )}

        {viewMoreOpen && userDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="app-card rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold app-text">
                  Full User Data
                </div>

                <button
                  onClick={() => setViewMoreOpen(false)}
                  className="rounded-xl border px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>

              <pre className="text-xs whitespace-pre-wrap break-all app-muted bg-black/20 rounded-xl p-4 overflow-auto">
                {JSON.stringify(userDoc, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {confirmOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="app-card rounded-2xl p-6 w-full max-w-sm">
              <div className="text-sm font-semibold app-text">
                Confirm Admin Password
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-4 w-full rounded-xl border app-input px-3 py-2 text-sm"
                placeholder="Re-enter admin password"
              />

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-xl border px-4 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    pendingAction?.();
                    setConfirmOpen(false);
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border app-card p-5 shadow-sm mt-5">
      <div className="text-sm font-semibold mb-3 app-text">
        {title}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value?: number;
}) {
  return (
    <div className="rounded-xl border app-card p-3">
      <div className="text-xs app-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold app-text">
        {value ?? "—"}
      </div>
    </div>
  );
}