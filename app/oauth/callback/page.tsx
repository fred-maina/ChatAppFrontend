"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";

export default function OAuthCallback() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = params.get("code");

    if (!code) {
      router.push("/auth");
      return;
    }

    fetch("http://localhost:8080/api/auth/oauth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirectUri: "http://localhost:3000/oauth/callback",
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.token) {
          localStorage.setItem("token", data.token);
          router.push("/dashboard");
        } else if (data.message === "Username required") {
          router.push(`/set-username?email=${data.user.email}`);
        } else {
          alert(data.message);
          router.push("/auth");
        }
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
      <FcGoogle className="text-5xl mb-4 animate-pulse" />
      <h1 className="text-xl font-semibold text-gray-800">Signing you in with Google…</h1>
      <p className="text-sm text-gray-500 mt-1">Please wait while we complete your authentication.</p>
      <div className="mt-6">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
