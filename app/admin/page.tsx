"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

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
  const router = useRouter();
  const { user } = useAuth();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!user) {
        setChecking(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      const role = snap.exists() ? (snap.data() as any).role : null;

      if (cancelled) return;

      if (role === "admin") {
        setIsAdmin(true);
        setChecking(false);
      } else {
        setIsAdmin(false);
        setChecking(false);
        router.replace("/home");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [user, router]);

  useEffect(() => {
    if (checking) return;
    if (!user) router.replace("/login");
  }, [checking, user, router]);

  if (checking) return null;
  if (!user) return null;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold text-gray-900">
              Admin Command Console
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Desktop-only • Invisible admin auth
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.replace("/home")}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm"
            >
              Exit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <Section title="System Status">
              <div className="grid grid-cols-6 gap-3">
                <div className="rounded-xl border bg-white p-3">
                  <div className="text-xs text-gray-500">Total Users</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    —
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <div className="text-xs text-gray-500">New Users (Today)</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    —
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <div className="text-xs text-gray-500">Active (Today)</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    —
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <div className="text-xs text-gray-500">Premium Users</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    —
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <div className="text-xs text-gray-500">Likes (Today)</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    —
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <div className="text-xs text-gray-500">Dates Accepted</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    —
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <div className="col-span-12">
            <Section title="Quick Actions">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <div className="text-xs text-gray-600">Find user (uid/phone)</div>
                  <input
                    className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="Enter UID or phone"
                  />
                </div>

                <div className="col-span-3">
                  <div className="text-xs text-gray-600">Coins</div>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900"
                      placeholder="+10"
                    />
                    <button className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                      Apply
                    </button>
                  </div>
                </div>

                <div className="col-span-5">
                  <div className="text-xs text-gray-600">Actions</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                      Grant Premium
                    </button>
                    <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                      Revoke Premium
                    </button>
                    <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                      Ban
                    </button>
                    <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                      Unban
                    </button>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <div className="col-span-12">
            <Section title="Users Control">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-5">
                  <input
                    className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="Search users by name / phone / uid"
                  />
                </div>
                <div className="col-span-7 flex items-center gap-2">
                  <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    All
                  </button>
                  <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    Premium
                  </button>
                  <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    Free
                  </button>
                  <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    New (7d)
                  </button>
                  <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    Banned
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border bg-white">
                <div className="grid grid-cols-12 gap-0 border-b bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                  <div className="col-span-3">User</div>
                  <div className="col-span-2">Phone</div>
                  <div className="col-span-2">Coins</div>
                  <div className="col-span-2">Premium</div>
                  <div className="col-span-1">Likes</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                <div className="grid grid-cols-12 gap-0 px-4 py-4 text-sm text-gray-700">
                  <div className="col-span-3">—</div>
                  <div className="col-span-2">—</div>
                  <div className="col-span-2">—</div>
                  <div className="col-span-2">—</div>
                  <div className="col-span-1">—</div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm">
                      Open
                    </button>
                    <button className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm">
                      Ban
                    </button>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <div className="col-span-12">
            <Section title="Monetization Control">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <div className="text-xs text-gray-600">Coin price (USD)</div>
                  <input
                    className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="e.g. 1 coin = $0.10"
                  />
                </div>
                <div className="col-span-4">
                  <div className="text-xs text-gray-600">Promo bonus coins</div>
                  <input
                    className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="e.g. +20"
                  />
                </div>
                <div className="col-span-4 flex items-end gap-2">
                  <button className="w-full rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    Save
                  </button>
                  <button className="w-full rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    Apply to New Users
                  </button>
                </div>
              </div>
            </Section>
          </div>

          <div className="col-span-12">
            <Section title="Notifications & Messaging">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <div className="text-xs text-gray-600">Audience</div>
                  <select className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900">
                    <option>All users</option>
                    <option>Premium users</option>
                    <option>Free users</option>
                    <option>Specific user</option>
                  </select>
                </div>
                <div className="col-span-9">
                  <div className="text-xs text-gray-600">Message</div>
                  <input
                    className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="Type notification text"
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                  Send 🔔
                </button>
              </div>
            </Section>
          </div>

          <div className="col-span-12">
            <Section title="Rankings & Insights">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6 rounded-xl border bg-white p-4">
                  <div className="text-xs font-semibold text-gray-600">
                    Most liked profiles
                  </div>
                  <div className="mt-3 text-sm text-gray-700">—</div>
                </div>
                <div className="col-span-6 rounded-xl border bg-white p-4">
                  <div className="text-xs font-semibold text-gray-600">
                    Most active users
                  </div>
                  <div className="mt-3 text-sm text-gray-700">—</div>
                </div>
              </div>
            </Section>
          </div>

          <div className="col-span-12">
            <Section title="Moderation">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6">
                  <div className="text-xs text-gray-600">User UID / phone</div>
                  <input
                    className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="Enter UID or phone"
                  />
                </div>
                <div className="col-span-6 flex items-end justify-end gap-2">
                  <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    Ban
                  </button>
                  <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    Unban
                  </button>
                  <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    Remove Premium
                  </button>
                  <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                    Zero Coins
                  </button>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
