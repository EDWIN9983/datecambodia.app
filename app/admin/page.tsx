"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type UserResult = {
  uid: string;
  name?: string;
  publicId?: string;
  gender?: string;
  phone?: string;
  isBanned?: boolean;
  coinBUntil?: any;
  coinsA?: number;
  isVerified?: boolean;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-5 bg-white shadow-sm">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value ?? "—"}</div>
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState(false);

  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [newUsersToday, setNewUsersToday] = useState<number | null>(null);
  const [activeToday, setActiveToday] = useState<number | null>(null);
  const [premiumUsers, setPremiumUsers] = useState<number | null>(null);
  const [totalLikes, setTotalLikes] = useState<number | null>(null);
  const [acceptedDates, setAcceptedDates] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [userDoc, setUserDoc] = useState<UserResult | null>(null);
  const [loading, setLoading] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const [premiumDays, setPremiumDays] = useState(7);
  const [coinsAmount, setCoinsAmount] = useState(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);

  const [filters, setFilters] = useState({
    premium: null as boolean | null,
    gender: null as "male" | "female" | null,
    hasPhone: null as boolean | null,
    banned: null as boolean | null,
    newJoin: null as "today" | "7d" | null,
    verified: null as boolean | null,
  });
  const [list, setList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  function handleSubmit() {
    if (password === ADMIN_PASSWORD) {
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

  async function loadList() {
    setListLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list",
          ...filters,
          adminPassword: password,
        }),
      });

      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setList(data.users || []);
    } catch {
      setList([]);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (!authorized) return;
    async function loadStats() {
      const usersCol = collection(db, "users");
      const now = new Date();
      const today = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

      setTotalUsers((await getCountFromServer(usersCol)).data().count);
      setNewUsersToday((await getCountFromServer(query(usersCol, where("createdAt", ">=", today)))).data().count);
      setActiveToday((await getCountFromServer(query(usersCol, where("lastActive", ">=", today)))).data().count);
      setPremiumUsers((await getCountFromServer(query(usersCol, where("coinBUntil", ">", Timestamp.now())))).data().count);

      let likes = 0;
      (await getDocs(usersCol)).forEach((d) => {
        likes += d.data().likesCount || 0;
      });
      setTotalLikes(likes);

      setAcceptedDates(
        (await getCountFromServer(query(collection(db, "dateRequests"), where("respondedAt", "!=", null)))).data().count
      );
    }
    loadStats();
  }, [authorized]);

  async function handleSearch() {
    if (!search.trim()) return;
    setLoading(true);
    setResults([]);
    setUserDoc(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search", search, adminPassword: password }),
    });
    const data = await res.json();
    if (data?.user) {
      setResults([data.user]);
      setUserDoc(data.user);
    }
    setLoading(false);
  }

  async function handleBanToggle(banned: boolean) {
    if (!userDoc) return;
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ban", uid: userDoc.uid, banned, adminPassword: password }),
    });
    setUserDoc({ ...userDoc, isBanned: banned });
  }

  function startEdit() {
    setEditData(userDoc);
    setEditMode(true);
  }

  async function applyEdit() {
    const { uid, ...updates } = editData;
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", uid, updates, adminPassword: password }),
    });
    setUserDoc(editData);
    setEditMode(false);
  }

  async function applyPremium() {
    if (!userDoc?.uid) return;
    const until = new Date();
    until.setDate(until.getDate() + premiumDays);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "premium", uid: userDoc.uid, until, adminPassword: password }),
    });
    setUserDoc({ ...userDoc, coinBUntil: until });
  }

  async function applyCoins() {
    if (!userDoc?.uid) return;
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "coins", uid: userDoc.uid, coins: coinsAmount, adminPassword: password }),
    });
    setUserDoc({ ...userDoc, coinsA: coinsAmount });
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="rounded-xl border bg-white p-6 w-full max-w-sm">
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
          />
          {error && <div className="text-red-600 text-xs mt-2">Wrong password</div>}
          <button onClick={handleSubmit} className="mt-4 w-full border rounded-xl py-2">Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-6">
      <Section title="System Status">
        <div className="grid grid-cols-6 gap-3">
          <Stat label="Total Users" value={totalUsers} />
          <Stat label="New Today" value={newUsersToday} />
          <Stat label="Active Today" value={activeToday} />
          <Stat label="Premium" value={premiumUsers} />
          <Stat label="Likes" value={totalLikes} />
          <Stat label="Dates Accepted" value={acceptedDates} />
        </div>
      </Section>

      <Section title="User Filters (Read-only)">
        <div className="grid grid-cols-6 gap-2">
          <select onChange={e => setFilters(f => ({...f, premium: e.target.value === "" ? null : e.target.value === "true"}))} className="rounded-xl border p-2 text-sm">
            <option value="">Premium</option><option value="true">Yes</option><option value="false">No</option>
          </select>
          <select
            onChange={e =>
              setFilters(f => ({
                ...f,
                gender: (e.target.value === "" ? null : (e.target.value as "male" | "female")),
              }))
            }
            className="rounded-xl border p-2 text-sm"
          >
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <select onChange={e => setFilters(f => ({...f, hasPhone: e.target.value === "" ? null : e.target.value === "true"}))} className="rounded-xl border p-2 text-sm">
            <option value="">Phone</option><option value="true">Has</option><option value="false">No</option>
          </select>
          <select onChange={e => setFilters(f => ({...f, banned: e.target.value === "" ? null : e.target.value === "true"}))} className="rounded-xl border p-2 text-sm">
            <option value="">Status</option><option value="false">Active</option><option value="true">Banned</option>
          </select>
          <select
            onChange={e =>
              setFilters(f => ({
                ...f,
                newJoin: (e.target.value === "" ? null : (e.target.value as "today" | "7d")),
              }))
            }
            className="rounded-xl border p-2 text-sm"
          >
            <option value="">Joined</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
          </select>
          <button onClick={loadList} className="rounded-xl border px-4 py-2 text-sm font-semibold">Apply</button>
        </div>
      </Section>

      <Section title="Users List">
        {listLoading && <div className="text-sm text-gray-500">Loading…</div>}
        <div className="divide-y">
          {list.map(u => (
            <button key={u.uid} onClick={() => setUserDoc(u)} className="w-full text-left p-3 hover:bg-gray-50">
              <div className="font-semibold">{u.name || "—"} <span className="text-xs text-gray-500">{u.publicId || ""}</span></div>
              <div className="text-xs text-gray-500">{u.gender || "—"} · {u.phone ? "Has phone" : "No phone"}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="User Search">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border rounded-xl px-3 py-2"
            placeholder="UID / PublicID / Name / ChatID"
          />
          <button onClick={handleSearch} className="border rounded-xl px-4">Search</button>
        </div>

        {loading && <div className="mt-3 text-sm">Searching…</div>}

        {userDoc && (
          <div className="mt-4 space-y-3">
            {!editMode ? (
              <>
                <pre className="bg-gray-50 p-4 rounded-xl text-xs overflow-x-auto">{JSON.stringify(userDoc, null, 2)}</pre>
                <div className="flex gap-2">
                  <button onClick={startEdit} className="border rounded-xl px-4 py-2">Edit</button>
                  <button onClick={() => requireConfirm(() => handleBanToggle(!userDoc.isBanned))} className="border rounded-xl px-4 py-2">{userDoc.isBanned ? "Unban" : "Ban"}</button>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex gap-2 items-center">
                    <input type="number" value={premiumDays} onChange={(e) => setPremiumDays(Number(e.target.value))} className="w-24 rounded-xl border px-2 py-1 text-sm"/>
                    <button onClick={() => requireConfirm(applyPremium)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Grant Premium (days)</button>
                  </div>

                  <div className="flex gap-2 items-center">
                    <input type="number" value={coinsAmount} onChange={(e) => setCoinsAmount(Number(e.target.value))} className="w-24 rounded-xl border px-2 py-1 text-sm"/>
                    <button onClick={() => requireConfirm(applyCoins)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Set Coins</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <textarea value={JSON.stringify(editData, null, 2)} onChange={(e) => setEditData(JSON.parse(e.target.value))} className="w-full h-80 border rounded-xl p-3 font-mono text-xs"/>
                <div className="flex gap-2">
                  <button onClick={() => requireConfirm(applyEdit)} className="border rounded-xl px-4 py-2">Apply</button>
                  <button onClick={() => setEditMode(false)} className="border rounded-xl px-4 py-2">Cancel</button>
                </div>
              </>
            )}
          </div>
        )}
      </Section>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="text-sm font-semibold text-gray-900">Confirm Admin Password</div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-4 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Re-enter admin password"/>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setConfirmOpen(false)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button>
              <button onClick={() => { pendingAction?.(); setConfirmOpen(false); }} className="rounded-xl border px-4 py-2 text-sm font-semibold">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
