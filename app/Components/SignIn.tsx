"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // Import Link for "Forgot password"

export default function SigninForm() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" }); // 'username' can be email or username
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Sign-in failed. Please check your credentials and try again.");
      } else {
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        // Optionally, you might want to store user info if returned and needed globally
        // For example: if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard"); // Redirect on success
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again later.");
      console.error("Signin error:", err); // Log error for debugging
    }
  };

  return (
    // Removed max-w-md, mx-auto, mt-10, p-6, border, rounded-xl, shadow, bg-white
    // Parent AuthPage.tsx now handles card styling and spacing.
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Form title is now part of AuthPage.tsx */}
      {/* This component now just renders the form fields. */}

      {/* Error Message */}
      {error && <p className="text-red-600 text-sm text-center bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

      {/* Email or Username */}
      <div className="relative">
        <input
          id="username_signin" // Added id for label htmlFor
          type="text"
          name="username" // This field can accept email or username
          value={form.username}
          onChange={handleChange}
          required
          className="peer w-full border border-gray-300 px-3 pt-5 pb-2 rounded-lg placeholder-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          placeholder="Email or Username"
        />
        <label
          htmlFor="username_signin"
          className="absolute left-3 top-1 text-xs text-gray-500 transition-all 
                     peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
                     peer-focus:top-1 peer-focus:text-xs peer-focus:text-teal-600"
        >
          Email or Username
        </label>
      </div>

      {/* Password */}
      <div className="relative">
        <input
          id="password_signin" // Added id for label htmlFor
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          className="peer w-full border border-gray-300 px-3 pt-5 pb-2 rounded-lg placeholder-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          placeholder="Password"
        />
        <label
          htmlFor="password_signin"
          className="absolute left-3 top-1 text-xs text-gray-500 transition-all 
                     peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
                     peer-focus:top-1 peer-focus:text-xs peer-focus:text-teal-600"
        >
          Password
        </label>
      </div>
      
      {/* Forgot Password Link (Example) */}
      <div className="text-right text-sm">
        <Link href="/forgot-password" // Update with your actual forgot password route
          className="font-medium text-teal-600 hover:text-teal-700 hover:underline"
        >
          Forgot password?
        </Link>
      </div>


      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2.5 px-4 rounded-lg font-semibold shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-150 ease-in-out transform active:scale-[0.98]"
      >
        Sign In
      </button>

      {/* Removed "Forgot Username" as it's less common, email/username field is combined. */}
      {/* If you need "Forgot Username" specifically, it can be added back. */}
    </form>
  );
}