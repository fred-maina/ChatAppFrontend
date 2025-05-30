import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css"; // Ensures Tailwind and global styles are loaded

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Improves font loading performance
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Improves font loading performance
});

export const metadata: Metadata = {
  title: "AnonMsg - Anonymous Messaging", // Updated title
  description: "Send and receive anonymous messages hassle-free.", // Updated description
  // Consider adding more metadata like icons, open graph tags, etc.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-gray-50 text-gray-800 selection:bg-teal-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}