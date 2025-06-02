import type { Metadata } from "next";
import "./globals.css"; // Ensures Tailwind and global styles are loaded

export const metadata: Metadata = {
  title: "AnonMsg - Anonymous Messaging", // Updated title
  description: "Send and receive anonymous messages hassle-free.", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
   
      <body
        className={`h-full antialiased bg-gray-50 text-gray-800 selection:bg-teal-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}