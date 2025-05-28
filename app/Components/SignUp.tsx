"use client";
import { useState } from "react";

export default function SignupForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    acceptedTerms: false,
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.acceptedTerms) {
      setError("You must accept the terms and conditions.");
      return;
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message || "Signup failed");
    } else {
      setMessage("Signup successful! Please log in.");
      setForm({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        password: "",
        acceptedTerms: false,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* First/Last Name */}
      <div className="flex gap-4">
        <div className="relative w-1/2">
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
            className="peer w-full border px-3 pt-6 pb-2 rounded-lg placeholder-transparent focus:ring-2 focus:ring-primary"
            placeholder="First Name"
          />
          <label className="absolute left-3 top-1.5 text-sm text-gray-500 transition-all 
            peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
            peer-focus:top-1.5 peer-focus:text-sm">
            First Name
          </label>
        </div>
        <div className="relative w-1/2">
          <input
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            required
            className="peer w-full border px-3 pt-6 pb-2 rounded-lg placeholder-transparent focus:ring-2 focus:ring-primary"
            placeholder="Last Name"
          />
          <label className="absolute left-3 top-1.5 text-sm text-gray-500 transition-all 
            peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
            peer-focus:top-1.5 peer-focus:text-sm">
            Last Name
          </label>
        </div>
      </div>

      {/* Username */}
      <div className="relative">
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          required
          className="peer w-full border px-3 pt-6 pb-2 rounded-lg placeholder-transparent focus:ring-2 focus:ring-primary"
          placeholder="Username"
        />
        <label className="absolute left-3 top-1.5 text-sm text-gray-500 transition-all 
          peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
          peer-focus:top-1.5 peer-focus:text-sm">
          Username
        </label>
      </div>

      {/* Email */}
      <div className="relative">
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          className="peer w-full border px-3 pt-6 pb-2 rounded-lg placeholder-transparent focus:ring-2 focus:ring-primary"
          placeholder="Email"
        />
        <label className="absolute left-3 top-1.5 text-sm text-gray-500 transition-all 
          peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
          peer-focus:top-1.5 peer-focus:text-sm">
          Email
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
        <label className="absolute left-3 top-1.5 text-sm text-gray-500 transition-all 
          peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
          peer-focus:top-1.5 peer-focus:text-sm">
          Password
        </label>
      </div>

      {/* Terms and Conditions */}
      <div className="flex items-start text-sm gap-2">
        <input
          type="checkbox"
          name="acceptedTerms"
          checked={form.acceptedTerms}
          onChange={handleChange}
          required
          className="mt-1 accent-green-600"
        />
        <label className="text-gray-600">
          I agree to the{" "}
          <a href="#" className="text-primary hover:underline">
            terms and conditions
          </a>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded-lg font-semibold shadow hover:scale-[1.01] transition cursor-pointer"
      >
        Sign Up
      </button>

      {/* Feedback */}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {message && <p className="text-green-600 text-sm">{message}</p>}
    </form>
  );
}
