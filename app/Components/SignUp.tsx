// app/Components/SignUp.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LegalModal from "./LegalModal";
import TermsAndConditionsContent from "./TermsAndConditionsContent"; // Corrected import
import PrivacyPolicyContent from "./PrivacyPolicyContent";

export default function SignupForm() {
  const router = useRouter();

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

  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalContent, setLegalModalContent] = useState<React.ReactNode>(null);
  const [legalModalTitle, setLegalModalTitle] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.acceptedTerms) {
      setError("You must accept the terms and conditions to proceed.");
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Sign up failed. Please check your details and try again.");
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      
      setMessage("Signup successful! Redirecting to your dashboard...");

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);

    } catch (err) {
      setError("An unexpected error occurred. Please try again later.");
      console.error("Signup error:", err);
    }
  };

  const openTermsModal = () => {
    setLegalModalTitle("Terms and Conditions");
    setLegalModalContent(<TermsAndConditionsContent />); // Now uses the correct content component
    setIsLegalModalOpen(true);
  };

  const openPrivacyModal = () => {
    setLegalModalTitle("Privacy Policy");
    setLegalModalContent(<PrivacyPolicyContent />);
    setIsLegalModalOpen(true);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ... (rest of your form inputs: firstName, lastName, username, email, password) ... */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:w-1/2">
            <input
              id="firstName" 
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
              className="peer w-full border border-gray-300 px-3 pt-5 pb-2 rounded-lg placeholder-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
              placeholder="First Name"
            />
            <label
              htmlFor="firstName"
              className="absolute left-3 top-1 text-xs text-gray-500 transition-all 
                       peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
                       peer-focus:top-1 peer-focus:text-xs peer-focus:text-teal-600"
            >
              First Name
            </label>
          </div>
          <div className="relative w-full sm:w-1/2">
            <input
              id="lastName"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
              className="peer w-full border border-gray-300 px-3 pt-5 pb-2 rounded-lg placeholder-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
              placeholder="Last Name"
            />
            <label
              htmlFor="lastName"
              className="absolute left-3 top-1 text-xs text-gray-500 transition-all 
                       peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
                       peer-focus:top-1 peer-focus:text-xs peer-focus:text-teal-600"
            >
              Last Name
            </label>
          </div>
        </div>

        <div className="relative">
          <input
            id="username_signup" 
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            className="peer w-full border border-gray-300 px-3 pt-5 pb-2 rounded-lg placeholder-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            placeholder="Username"
          />
          <label
            htmlFor="username_signup"
            className="absolute left-3 top-1 text-xs text-gray-500 transition-all 
                     peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
                     peer-focus:top-1 peer-focus:text-xs peer-focus:text-teal-600"
          >
            Username
          </label>
        </div>

        <div className="relative">
          <input
            id="email_signup" 
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="peer w-full border border-gray-300 px-3 pt-5 pb-2 rounded-lg placeholder-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            placeholder="Email"
          />
          <label
            htmlFor="email_signup"
            className="absolute left-3 top-1 text-xs text-gray-500 transition-all 
                     peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
                     peer-focus:top-1 peer-focus:text-xs peer-focus:text-teal-600"
          >
            Email
          </label>
        </div>

        <div className="relative">
          <input
            id="password_signup" 
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            className="peer w-full border border-gray-300 px-3 pt-5 pb-2 rounded-lg placeholder-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
            placeholder="Password"
          />
          <label
            htmlFor="password_signup"
            className="absolute left-3 top-1 text-xs text-gray-500 transition-all 
                     peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base 
                     peer-focus:top-1 peer-focus:text-xs peer-focus:text-teal-600"
          >
            Password
          </label>
        </div>
        <div className="flex items-start text-sm gap-2 pt-1">
          <input
            id="acceptedTerms"
            type="checkbox"
            name="acceptedTerms"
            checked={form.acceptedTerms}
            onChange={handleChange}
            required
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
          />
          <label htmlFor="acceptedTerms" className="text-gray-600">
            I agree to the{" "}
            <button
              type="button"
              onClick={openTermsModal}
              className="text-teal-600 hover:text-teal-700 hover:underline font-medium"
            >
              Terms and Conditions
            </button>
            {" "}and have read the{" "}
             <button
              type="button"
              onClick={openPrivacyModal}
              className="text-teal-600 hover:text-teal-700 hover:underline font-medium"
            >
              Privacy Policy
            </button>.
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2.5 px-4 rounded-lg font-semibold shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-150 ease-in-out transform active:scale-[0.98]"
        >
          Sign Up
        </button>

        {error && <p className="text-red-600 text-sm text-center py-1">{error}</p>}
        {message && <p className="text-teal-600 text-sm text-center py-1">{message}</p>}
      </form>

      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        title={legalModalTitle}
        content={legalModalContent}
      />
    </>
  );
}