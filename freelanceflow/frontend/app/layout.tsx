import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreelanceFlow",
  description: "A calm, mobile-first workspace for solo freelance social media managers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-zinc-950">
      <body className="min-h-[100dvh] bg-zinc-950 text-zinc-100 antialiased selection:bg-[#d97745] selection:text-zinc-950">
        {children}
      </body>
    </html>
  );
}
