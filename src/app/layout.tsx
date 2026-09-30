import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SprachDost — India will speak German 🇩🇪",
  description:
    "Learn to SPEAK German (A1–C2) by talking with AI avatars — real voice conversations, simple English explanations, Goethe exam prep. Free to start, built for Indian learners.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  themeColor: "#0b1020",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SprachDost",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
