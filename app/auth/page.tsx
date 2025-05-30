"use client";

import { useState } from "react";
import SignupForm from "../Components/SignUp";
import SigninForm from "../Components/SignIn";
import { GoogleLoginButton } from "../Components/GoogleLoginButton";
import Image from "next/image";
import { UserPlus, LogIn } from "lucide-react"; // Added icons for tabs

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(true);

  return (
    <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side: Forms */}
        <div className="p-8 md:p-10 flex flex-col justify-center relative"> {/* Simplified background, increased padding */}
          {/* Top Tab Switcher */}
          <div className="flex w-full mb-8 rounded-lg overflow-hidden text-center font-medium shadow-sm border border-gray-200">
            <div
              onClick={() => setIsSignup(true)}
              className={`w-1/2 py-3 cursor-pointer transition-colors duration-200 ease-in-out flex items-center justify-center space-x-2 ${
                isSignup
                  ? "bg-teal-500 text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-teal-600"
              }`}
            >
              <UserPlus size={18} />
              <span>Sign Up</span>
            </div>
            <div
              onClick={() => setIsSignup(false)}
              className={`w-1/2 py-3 cursor-pointer transition-colors duration-200 ease-in-out flex items-center justify-center space-x-2 ${
                !isSignup
                  ? "bg-teal-500 text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-teal-600"
              }`}
            >
              <LogIn size={18} />
              <span>Sign In</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            {isSignup ? "Create Your Account" : "Welcome Back"}
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            {isSignup
              ? "Get started by creating your AnonMsg account."
              : "Sign in to access your dashboard and chats."}
          </p>

          {/* Google Auth Button */}
          <div className="mb-6">
            <GoogleLoginButton mode={isSignup ? "signup" : "signin"} />
          </div>
          

          {/* Divider */}
          <div className="flex items-center my-2">
            <hr className="flex-grow border-t border-gray-300" />
            <p className="mx-3 text-xs text-gray-400 uppercase">Or</p>
            <hr className="flex-grow border-t border-gray-300" />
          </div>
          
          {/* Form Directly Rendered */}
          <div className="mt-6"> {/* Added margin top for spacing */}
            {isSignup ? <SignupForm /> : <SigninForm />}
          </div>
        </div>

        {/* Right Side: Image */}
        <div className="hidden md:block relative">
          <Image
            src="https://images.unsplash.com/photo-1508780709619-79562169bc64?auto=format&fit=crop&w=987&q=80" //
            alt="Abstract background representing authentication or security"
            layout="fill"
            objectFit="cover"
            className="rounded-r-2xl" // Ensure this is only applied if it's the rightmost element of the card
            priority // Good for LCP elements
          />
           <div className="absolute inset-0 bg-gradient-to-br from-teal-500/30 via-sky-500/30 to-purple-600/30"></div> {/* Subtle overlay on image */}
        </div>
      </div>
    </div>
  );
}