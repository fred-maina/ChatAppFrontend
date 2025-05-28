"use client";

import { FcGoogle } from "react-icons/fc";

type GoogleLoginButtonProps = {
  mode: "signup" | "signin";
};

export function GoogleLoginButton({ mode }: GoogleLoginButtonProps) {
  const handleGoogleLogin = () => {
    const endpoint =
      mode === "signup" ? "/api/auth/google/signup" : "/api/auth/google/signin";
    window.location.href = endpoint;
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="group flex items-center justify-center space-x-3 w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg shadow-sm 
        hover:bg-gray-100 hover:shadow-md transition-all duration-200 ease-in-out 
        transform hover:scale-[1.02] active:scale-95 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 
        cursor-pointer"
    >
      <FcGoogle className="text-2xl transition-transform duration-200 group-hover:scale-110" />
      <span className="font-medium">
        {mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
      </span>
    </button>
  );
}
