// app/auth/page.tsx
"use client";

import { useState } from "react";
import { GoogleLoginButton } from "../Components/GoogleLoginButton"; //
import Image from "next/image";
import Link from "next/link";
import { MessageSquareText, ShieldCheck } from "lucide-react";
import LegalModal from "../Components/LegalModal"; //
import TermsAndConditionsContent from "../Components/TermsAndConditionsContent"; //
import PrivacyPolicyContent from "../Components/PrivacyPolicyContent"; //

const MASK_IMAGE_URL = "/images/mask.png";
const YOUR_APP_NAME = "AnonMsg";

export default function AuthPage() {
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalContent, setLegalModalContent] = useState<React.ReactNode>(null);
  const [legalModalTitle, setLegalModalTitle] = useState("");

  const openTermsModal = () => {
    setLegalModalTitle("Terms and Conditions");
    setLegalModalContent(<TermsAndConditionsContent />); //
    setIsLegalModalOpen(true);
  };

  const openPrivacyModal = () => {
    setLegalModalTitle("Privacy Policy");
    setLegalModalContent(<PrivacyPolicyContent />); //
    setIsLegalModalOpen(true);
  };

  return (
    <>
      <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center p-4 font-['Inter',_sans-serif]">
        <div className="w-full max-w-xl bg-white shadow-2xl rounded-xl overflow-hidden">
          <div className="p-8 md:p-12">
            <Link href="/" className="flex items-center justify-center space-x-2 mb-8 cursor-pointer group" passHref>
              <MessageSquareText className="h-10 w-10 text-teal-500 transition-transform duration-300 group-hover:scale-110" />
              <span className="text-3xl font-bold text-gray-700 group-hover:text-teal-600 transition-colors">{YOUR_APP_NAME}</span>
            </Link>

            <div className="flex justify-center mb-8">
              <div className="relative w-32 h-32 md:w-40 md:h-40">
                  <Image
                      src={MASK_IMAGE_URL}
                      alt="AnonMsg Mask"
                      layout="fill"
                      objectFit="contain"
                      className="animate-slowPulse"
                      priority 
                  />
              </div>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-3">
              Join or Sign in to {YOUR_APP_NAME}
            </h1>
            <p className="text-sm text-gray-500 text-center mb-8">
              Connect securely with Google to start sending and receiving anonymous messages.
            </p>

            <div className="mb-6">
              <GoogleLoginButton mode={"connect"} /> {/* Changed mode to "connect" */}
            </div>
            
            <div className="text-center text-xs text-gray-500">
              <p className="mb-2">
                By continuing, you agree to AnonMsg&apos;s{" "}
                <button
                  onClick={openTermsModal}
                  className="text-teal-600 hover:text-teal-700 hover:underline font-medium"
                >
                  Terms of Service
                </button>
                {" "}and acknowledge our{" "}
                <button
                  onClick={openPrivacyModal}
                  className="text-teal-600 hover:text-teal-700 hover:underline font-medium"
                >
                  Privacy Policy
                </button>.
              </p>
              <ShieldCheck className="inline-block h-4 w-4 text-green-500 mr-1" />
              <span>Your privacy is important to us.</span>
            </div>
          </div>
        </div>
        <style jsx global>{`
          @keyframes slowPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.9; }
          }
          .animate-slowPulse {
            animation: slowPulse 6s infinite ease-in-out;
          }
        `}</style>
      </div>
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        title={legalModalTitle}
        content={legalModalContent}
      />
    </>
  );
}