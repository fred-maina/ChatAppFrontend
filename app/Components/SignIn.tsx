"use client";
import { useState } from "react";

export default function SigninForm() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message || "Signin failed");
    } else {
      localStorage.setItem("token", data.token);
      window.location.href = "/dashboard";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Email or Username */}
      <div className="relative">
        <input
          type="text"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          className="peer w-full border px-3 pt-6 pb-2 rounded-lg placeholder-transparent focus:ring-2 focus:ring-primary"
          placeholder="Email or Username"
        />
        <label
          htmlFor="email"
          className="absolute left-3 top-1.5 text-sm text-gray-500 transition-all
                     peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base
                     peer-focus:top-1.5 peer-focus:text-sm peer-focus:text-primary"
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
          className="peer w-full border px-3 pt-6 pb-2 rounded-lg placeholder-transparent focus:ring-2 focus:ring-primary"
          placeholder="Password"
        />
        <label
          htmlFor="password"
          className="absolute left-3 top-1.5 text-sm text-gray-500 transition-all
                     peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base
                     peer-focus:top-1.5 peer-focus:text-sm peer-focus:text-primary"
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
        <a href="#" className="text-primary hover:underline cursor-pointer">
          Forgot Username?
        </a>{" "}
        |{" "}
        <a href="#" className="text-primary hover:underline cursor-pointer">
          Forgot Password?
        </a>
      </div>
    </form>
  );
}
