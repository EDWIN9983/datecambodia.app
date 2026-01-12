"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
  Timestamp,
  collection as col,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type AdminSectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: AdminSectionProps) {
  return (
    <section className="rounded-2xl border p-5 bg-white shadow-sm">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
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

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  function handleSubmit() {
    if (password === ADMIN_PASSWORD) {
      setAuthorized(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  useEffect(() => {
    if (!authorized) return;

    async function loadStats() {
      const usersCol = collection(db, "users");

      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const todayTs = Timestamp.fromDate(startOfToday);

      const totalSnap = await getCountFromServer(usersCol);
      setTotalUsers(totalSnap.data().count);

      const newTodaySnap = await getCountFromServer(
        query(usersCol, where("createdAt", ">=", todayTs))
      );
      setNewUsersToday(newTodaySnap.data().count);

      const activeSnap = await getCountFromServer(
        query(usersCol, where("lastActive", ">=", todayTs))
      );
      setActiveToday(activeSnap.data().count);

      const premiumSnap = await getCountFromServer(
        query(usersCol, where("isPremium", "==", true))
      );
      setPremiumUsers(premiumSnap.data().count);

      let likesSum = 0;
      const likesDocs = await getDocs(usersCol);
      likesDocs.forEach((doc) => {
        const data = doc.data();
        if (typeof data.likesCount === "number") {
          likesSum += data.likesCount;
        }
      });
      setTotalLikes(likesSum);

      const datesCol = col(db, "dateRequests");

      const acceptedSnap = await getCountFromServer(
        query(datesCol, where("respondedAt", "!=", null))
      );
      setAcceptedDates(acceptedSnap.data().count);
    }

    loadStats();
  }, [authorized]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-gray-900">
            Admin Access
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="mt-4 w-full rounded-xl border px-3 py-2 text-sm text-gray-900"
          />

          {error && (
            <div className="mt-2 text-xs text-red-600">
              Incorrect password
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="mt-4 w-full rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm"
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold text-gray-900">
              Admin Command Console
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Password-protected admin panel
            </div>
          </div>

          <button
            onClick={() => setAuthorized(false)}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm"
          >
            Exit
          </button>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <Section title="System Status">
              <div className="grid grid-cols-6 gap-3">
                <Stat label="Total Users" value={totalUsers} />
                <Stat label="New Users (Today)" value={newUsersToday} />
                <Stat label="Active (Today)" value={activeToday} />
                <Stat label="Premium Users" value={premiumUsers} />
                <Stat label="Likes (Total)" value={totalLikes} />
                <Stat label="Dates Accepted" value={acceptedDates} />
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">
        {value ?? "—"}
      </div>
    </div>
  );
}
