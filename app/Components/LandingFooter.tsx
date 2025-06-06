"use client";

import React from 'react';
import Link from 'next/link';
import { MessageSquareText, Coffee } from 'lucide-react';

interface LandingFooterProps {
  appName: string;
  buyMeACoffeeLink?: string;
  onOpenTermsModal: () => void;
  onOpenPrivacyModal: () => void;
}

const LandingFooter: React.FC<LandingFooterProps> = ({ appName, buyMeACoffeeLink, onOpenTermsModal, onOpenPrivacyModal }) => {
  return (
    <footer className="bg-gray-800 text-white py-12 px-6 md:px-10 text-center">
      <div className="container mx-auto">
        <div className="mb-4">
          <MessageSquareText className="h-10 w-10 text-teal-400 mx-auto mb-3" />
          <p className="text-xl font-semibold">{appName}</p>
        </div>
        <p className="mb-3 text-sm text-gray-400">
          Facilitating open and honest conversations, anonymously.
        </p>
        <nav className="flex flex-wrap justify-center items-center space-x-4 mb-6">
          <Link href="/auth" className="text-gray-300 hover:text-teal-400 text-sm">Login/Sign Up</Link>
          <span className="text-gray-500 text-sm">|</span>
          <button onClick={onOpenTermsModal} className="text-gray-300 hover:text-teal-400 text-sm cursor-pointer">Terms of Service</button>
          <span className="text-gray-500 text-sm">|</span>
          <button onClick={onOpenPrivacyModal} className="text-gray-300 hover:text-teal-400 text-sm cursor-pointer">Privacy Policy</button>
          {buyMeACoffeeLink && buyMeACoffeeLink !== "YOUR_BUY_ME_A_COFFEE_LINK_HERE" && (
            <>
              <span className="text-gray-500 text-sm hidden sm:inline">|</span>
              <a
                href={buyMeACoffeeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-yellow-400 text-sm flex items-center space-x-1.5 group mt-2 sm:mt-0"
              >
                <Coffee size={16} className="transition-transform duration-200 group-hover:scale-110" />
                <span>Support the Creator</span>
              </a>
            </>
          )}
        </nav>
        <p className="text-xs text-gray-500">
          Designed and developed by <a href="https://github.com/fred-maina">Fredrick Maina.</a> All rights reserved &copy; {new Date().getFullYear()} {appName}.
        </p>
      </div>
    </footer>
  );
};

export default LandingFooter;