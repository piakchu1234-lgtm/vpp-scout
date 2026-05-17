import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SimplySite",
  description:
    "SimplySite — Victoria property feasibility for the 2026 Small Second Dwelling pathway.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "SimplySite",
    description:
      "Victoria property feasibility for the 2026 Small Second Dwelling pathway.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SimplySite",
    description:
      "Victoria property feasibility for the 2026 Small Second Dwelling pathway.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
