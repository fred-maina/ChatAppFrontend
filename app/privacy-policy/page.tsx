// app/privacy-policy/page.tsx
import React from 'react';
import Link from 'next/link';
import { MessageSquareText, ShieldCheck } from 'lucide-react';
import PrivacyPolicyContent from '../Components/PrivacyPolicyContent'; // Import the content component

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 font-['Inter',_sans-serif] text-gray-800">
      <header className="py-4 px-6 md:px-10 shadow-md bg-white sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 cursor-pointer" passHref>
            <MessageSquareText className="h-8 w-8 text-teal-500 transition-transform duration-300 hover:scale-110" />
            <span className="text-xl font-semibold text-gray-700 hidden sm:block">AnonMsg</span>
          </Link>
          <Link href="/auth" passHref>
             <button className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75">
                Back to App
              </button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto py-12 px-6 md:px-10">
        <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg">
          <div className="flex items-center mb-6">
            <ShieldCheck className="h-10 w-10 text-teal-500 mr-3" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Privacy Policy</h1>
          </div>

          <div className="text-gray-700 space-y-4 prose prose-teal max-w-none">
            <p className="font-semibold text-red-600">
              DISCLAIMER: This is a sample Privacy Policy. You should consult with a legal professional to ensure this policy is appropriate for your specific needs and complies with all applicable laws, including GDPR, CCPA, etc.
            </p>
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            {/* Use the imported PrivacyPolicyContent component */}
            <PrivacyPolicyContent />
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-12 px-6 md:px-10 text-center mt-10">
        <div className="container mx-auto">
          <Link href="/" className="flex items-center justify-center space-x-2 cursor-pointer mb-3" passHref>
            <MessageSquareText className="h-8 w-8 text-teal-400" />
            <span className="text-lg font-semibold">AnonMsg</span>
          </Link>
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} AnonMsg. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;