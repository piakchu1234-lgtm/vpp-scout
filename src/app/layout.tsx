import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { UserPlanProvider } from '@/contexts/UserPlanContext';
import { ThemeProvider } from '@/components/theme-provider';
import GlobalControls from '@/components/GlobalControls';
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
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col">
          {/* Skip Link - WCAG 2.4.1 */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#E9E778] focus:text-[#0A0A0A] focus:font-semibold focus:rounded-lg focus:shadow-xl focus:outline-none"
          >
            Skip to main content
          </a>

          <ThemeProvider>
            <UserPlanProvider>
              <main id="main-content" tabIndex={-1} className="flex-1">
                {children}
              </main>
            </UserPlanProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
