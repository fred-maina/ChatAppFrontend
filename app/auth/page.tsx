"use client";
import { useState } from "react";
import SignupForm from "../Components/SignUp";
import SigninForm from "../Components/SignIn";
import { GoogleLoginButton } from "../Components/GoogleLoginButton";
import Image from "next/image";

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(true);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white/10 backdrop-blur-lg shadow-xl rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* Left Side: Forms */}
        <div className="p-10 flex flex-col justify-center bg-white/90 backdrop-blur-lg relative">
          
          {/* Top Tab Switcher */}
          <div className="flex w-full mb-8 rounded-xl overflow-hidden text-center text-white font-semibold shadow-sm">
            <div
              onClick={() => setIsSignup(true)}
              className={`w-1/2 py-3 cursor-pointer transition ${
                isSignup ? "bg-green-600" : "bg-gray-200 text-gray-600"
              }`}
            >
              Sign Up
            </div>
            <div
              onClick={() => setIsSignup(false)}
              className={`w-1/2 py-3 cursor-pointer transition ${
                !isSignup ? "bg-green-600" : "bg-gray-200 text-gray-600"
              }`}
            >
              Sign In
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            {isSignup ? "Create Your Account" : "Welcome Back"}
          </h1>
          <p className="text-sm text-gray-500 text-center mb-4">
            {isSignup ? "Sign up with Google or continue with email" : "Sign in with Google or continue with email"}
          </p>

          {/* Google Auth Button */}
          <GoogleLoginButton mode={isSignup ? "signup" : "signin"} />

          {/* Divider */}
          <p className="text-sm text-gray-400 text-center mt-4 mb-6">
            or continue with email
          </p>

          {/* Form Directly Rendered (no extra container) */}
          <div className="space-y-6">
            {isSignup ? <SignupForm /> : <SigninForm />}
          </div>
        </div>

        {/* Right Side: Image */}
        <div className="hidden md:block relative">
          <Image
            src="https://images.unsplash.com/photo-1508780709619-79562169bc64?auto=format&fit=crop&w=987&q=80"
            alt="Auth Illustration"
            layout="fill"
            objectFit="cover"
            className="rounded-r-2xl"
          />
        </div>
      </div>
    </div>
  );
}
