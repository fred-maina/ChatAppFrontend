"use client";

import { FcGoogle } from "react-icons/fc";

type GoogleLoginButtonProps = {
  mode: "signup" | "signin";
};

export function GoogleLoginButton({ mode }: GoogleLoginButtonProps) {
  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
    const redirectUri = "http://localhost:3000/oauth/callback";
    const scope = "openid email profile";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scope)}`;
  
    window.location.href = authUrl;
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
