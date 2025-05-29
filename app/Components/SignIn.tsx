"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SigninForm() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
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
        setError(data.message || "Sign-in failed");
      } else {
        localStorage.setItem("token", data.token);
        router.push("/dashboard"); // ✅ Redirect on success
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md mx-auto mt-10 p-6 border rounded-xl shadow bg-white">
      <h2 className="text-2xl font-semibold text-center text-green-700">Sign In to Your Account</h2>

      {error && <p className="text-red-600 text-sm text-center">{error}</p>}

      {/* Email or Username */}
      <div className="relative">
        <input
          type="text"
          name="username"
          value={form.username}
          onChange={handleChange}
          required
          className="peer w-full border px-3 pt-6 pb-2 rounded-lg placeholder-transparent focus:ring-2 focus:ring-green-600"
          placeholder="Email or Username"
        />
        <label
          htmlFor="username"
          className="absolute left-3 top-1.5 text-sm text-gray-500 transition-all
                     peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base
                     peer-focus:top-1.5 peer-focus:text-sm peer-focus:text-green-600"
        >
          Email or Username
        </label>
      </div>

      {/* Password */}
      <div className="relative">
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          className="peer w-full border px-3 pt-6 pb-2 rounded-lg placeholder-transparent focus:ring-2 focus:ring-green-600"
          placeholder="Password"
        />
        <label
          htmlFor="password"
          className="absolute left-3 top-1.5 text-sm text-gray-500 transition-all
                     peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base
                     peer-focus:top-1.5 peer-focus:text-sm peer-focus:text-green-600"
        >
          Password
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded-lg font-semibold shadow hover:scale-[1.01] transition cursor-pointer"
      >
        Sign In
      </button>

      {/* Forgot Links */}
      <div className="text-sm text-center text-gray-500">
        <a href="#" className="text-green-600 hover:underline cursor-pointer">
          Forgot Username?
        </a>{" "}
        |{" "}
        <a href="#" className="text-green-600 hover:underline cursor-pointer">
          Forgot Password?
        </a>
      </div>
    </form>
  );
}
