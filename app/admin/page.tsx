"use client";
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
  // ✅ Admin Auth
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState(false);

  // ✅ Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // ✅ Filters + Search + List
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

  // ✅ Selected User + Edit
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [editData, setEditData] = useState<Partial<UserDoc>>({});

  // ✅ Premium / Coins
  const [premiumDays, setPremiumDays] = useState(7);
  const [coinsAmount, setCoinsAmount] = useState(0);

  // ✅ Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);

  // ✅ Login
  function login() {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuthorized(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  // ✅ Confirmation helper
  function requireConfirm(action: () => void) {
    setPendingAction(() => action);
    setConfirmOpen(true);
  }

  // ✅ API helper
  async function api(action: string) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, adminPassword: password }),
    });
    if (!res.ok) return null;
    return res.json();
  }

  // ✅ Load List safely (NO APPLY WITHOUT FILTER)
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
    } catch {
      setList([]);
      setUserDoc(null);
    }
    setListLoading(false);
  }

  // ✅ Apply Premium
  async function applyPremium() {
    if (!userDoc?.uid) return;
    const until = new Date();
    until.setDate(until.getDate() + premiumDays);

    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "premium",
        uid: userDoc.uid,
        until,
        adminPassword: password,
      }),
    });

    setUserDoc({ ...userDoc, coinBUntil: until });
  }

  // ✅ Apply Coins
  async function applyCoins() {
    if (!userDoc?.uid) return;

    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "coins",
        uid: userDoc.uid,
        coins: coinsAmount,
        adminPassword: password,
      }),
    });

    setUserDoc({ ...userDoc, coinsA: coinsAmount });
  }

  // ✅ Ban / Unban
  async function handleBanToggle(ban: boolean) {
    if (!userDoc?.uid) return;

    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ban",
        uid: userDoc.uid,
        ban,
        adminPassword: password,
      }),
    });

    setUserDoc({ ...userDoc, isBanned: ban });
  }

  // ✅ Apply Edit
  async function applyEdit() {
    if (!userDoc?.uid || !editData) return;

    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        uid: userDoc.uid,
        updates: editData,
        adminPassword: password,
      }),
    });

    setUserDoc({ ...userDoc, ...editData });
    setEditData({});
  }

  // ✅ Fetch stats
  useEffect(() => {
    if (!authorized) return;
    api("stats").then((data) => {
      if (data) setStats(data);
    });
  }, [authorized]);

  // ✅ Unauthorized view
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold">Admin Access</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4 w-full rounded-xl border px-3 py-2 text-sm"
          />
          {error && <div className="mt-2 text-xs text-red-600">Incorrect password</div>}
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
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-6xl px-6 py-6">

        {/* System Status */}
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
        {/* Search + Filters */}
        <Section title="User Filters (Read-only)">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search UID / Name / Public ID"
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
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
              className="rounded-xl border p-2 text-sm"
            >
              <option value="">Premium</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>

            <select
              onChange={(e) =>
  		setFilters((f) => ({
		    ...f,
		    gender: e.target.value === "male" || e.target.value === "female"   			            ? e.target.value	
	            : null,
  		}))
		}
              className="rounded-xl border p-2 text-sm"
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
              className="rounded-xl border p-2 text-sm"
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
              className="rounded-xl border p-2 text-sm"
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
              className="rounded-xl border p-2 text-sm"
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
              className="rounded-xl border p-2 text-sm"
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

        {/* Users List */}
        <Section title="Users List">
          {listLoading && <div className="text-sm text-gray-500">Loading…</div>}
          <div className="divide-y">
            {list.map((u) => (
              <button
                key={u.uid}
                onClick={() => setUserDoc(u)}
                className="w-full text-left p-3 hover:bg-gray-50"
              >
                <div className="font-semibold">
                  {u.name || "—"}{" "}
                  <span className="text-xs text-gray-500">{u.publicId || ""}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {u.gender || "—"} · {u.phone ? "Has phone" : "No phone"} · {u.city || "—"}
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Selected User Actions */}
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
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={premiumDays}
                  onChange={(e) => setPremiumDays(Number(e.target.value))}
                  className="w-24 rounded-xl border px-2 py-1 text-sm"
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
                  className="w-24 rounded-xl border px-2 py-1 text-sm"
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
                    setEditData((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="Edit Name"
                  className="rounded-xl border px-2 py-1 text-sm"
                />
              </div>
            </div>
          </Section>
        )}

        {/* Confirmation Modal */}
        {confirmOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <div className="text-sm font-semibold text-gray-900">
                Confirm Admin Password
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-4 w-full rounded-xl border px-3 py-2 text-sm"
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

// Section & Stat Components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-5 bg-white shadow-sm mt-5">
      <div className="text-sm font-semibold mb-3">{title}</div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value ?? "—"}</div>
    </div>
  );
}
