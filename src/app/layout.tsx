import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Community Issue Tracker — AI-Powered Civic Reporting",
  description: "Report civic issues with AI-verified photos. Citizens, municipality officers, and super admins on one platform.",
  keywords: ["civic", "community", "issue tracker", "AI image detection", "municipality", "citizen reporting"],
  authors: [{ name: "Community Issue Tracker Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Community Issue Tracker",
    description: "AI-powered civic reporting platform with built-in image authenticity detection",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Community Issue Tracker",
    description: "AI-powered civic reporting platform with built-in image authenticity detection",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
