"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }

    fetch("http://localhost:8080/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) {
          router.push("/auth");
        } else {
          setUser(data);
        }
      });
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/auth");
  };

  if (!user) return <p>Loading dashboard...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Welcome, {user.firstName} 👋</h1>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-2">Account</h2>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Username:</strong> {user.username || "Not set"}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-2">Activity</h2>
            <p>You logged in via Google</p>
            <p className="text-sm text-gray-500 mt-2">This is mock data</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-2">Settings</h2>
            <p>Dark mode coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
