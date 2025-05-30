"use client";

import { FcGoogle } from "react-icons/fc";

type GoogleLoginButtonProps = {
  mode: "signup" | "signin";
};

export function GoogleLoginButton({ mode }: GoogleLoginButtonProps) {
  const handleGoogleLogin = () => {
    // Ensure NEXT_PUBLIC_GOOGLE_CLIENT_ID is set in your .env.local file
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth/callback"; // Allow override
    
    if (!clientId) {
      console.error("Google Client ID is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
      // Optionally, display an error to the user or disable the button
      alert("Google login is currently unavailable. Administrator has been notified.");
      return;
    }

    const scope = "openid email profile";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scope)}&prompt=consent`; // Added prompt=consent for consistent account selection
  
    window.location.href = authUrl;
  };
  
  return (
    <button
      onClick={handleGoogleLogin}
      type="button" // Explicitly set type to prevent form submission if inside a form
      className="group flex items-center justify-center space-x-3 w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg shadow-sm 
                 hover:bg-gray-50 hover:shadow-md transition-all duration-200 ease-in-out 
                 transform hover:scale-[1.01] active:scale-[0.98] 
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 
                 cursor-pointer"
    >
      <FcGoogle className="text-2xl transition-transform duration-200 group-hover:scale-110" />
      <span className="font-medium">
        {mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
      </span>
    </button>
  );
}