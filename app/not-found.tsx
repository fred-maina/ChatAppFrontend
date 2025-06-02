// app/not-found.tsx
import Link from 'next/link';
import { MessageSquareText, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-center p-6 font-['Inter',_sans-serif]">
      <header className="absolute top-0 left-0 right-0 py-4 px-6 md:px-10">
        <div className="container mx-auto flex justify-start items-center">
          <Link href="/" className="flex items-center space-x-2 cursor-pointer" passHref>
            <MessageSquareText className="h-8 w-8 text-teal-500 transition-transform duration-300 hover:scale-110" />
            <span className="text-xl font-semibold text-gray-700 hidden sm:block">AnonMsg</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-col items-center">
        <AlertTriangle className="w-20 h-20 text-yellow-500 mb-6" />
        <h1 className="text-5xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-3">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          Oops! The page you&apos;re looking for doesn&apos;t seem to exist. It might have been moved, deleted, or perhaps you mistyped the URL.
        </p>
        <Link href="/" passHref>
          <button className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75">
            Go Back Home
          </button>
        </Link>
      </main>
      <footer className="absolute bottom-0 left-0 right-0 py-6 text-center">
        <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} AnonMsg. All rights reserved.</p>
      </footer>
    </div>
  );
}