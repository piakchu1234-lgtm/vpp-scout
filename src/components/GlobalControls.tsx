/**
 * GLOBAL CONTROLS HEADER
 *
 * Floating top-right header overlay with:
 * - User profile (Clerk UserButton)
 * - Projects navigation
 * - Bilingual language toggle (EN/中文)
 * - Light/Dark mode toggle
 * - Semi-transparent backdrop
 * - Overlays map view without blocking interaction
 */

'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Languages, FolderOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

export default function GlobalControls() {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return placeholder while mounting to prevent layout shift
    return (
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-full animate-pulse" />
        <div className="w-20 h-10 bg-zinc-800 border border-zinc-700 rounded-lg animate-pulse" />
        <div className="w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-lg animate-pulse" />
      </div>
    );
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Keyboard support (WCAG 2.1.1)
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <>
      {/* User Profile Button (Clerk) */}
      <div className="flex items-center">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-10 h-10',
              userButtonPopoverCard: 'bg-zinc-900 border border-zinc-800',
              userButtonPopoverActionButton: 'hover:bg-zinc-800',
            }
          }}
        />
      </div>

      {/* Projects Button */}
      <button
        onClick={() => router.push('/projects')}
        aria-label="View saved projects"
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9E778]"
      >
        <FolderOpen className="w-4 h-4 text-zinc-400" aria-hidden="true" />
        <span className="text-sm font-medium text-zinc-100">
          Projects
        </span>
      </button>

      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        onKeyDown={(e) => handleKeyDown(e, toggleLanguage)}
        aria-label={`Switch to ${language === 'en' ? 'Chinese' : 'English'} language`}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9E778]"
      >
        <Languages className="w-4 h-4 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {language === 'en' ? 'EN' : '中文'}
        </span>
        <span className="sr-only">
          Current language: {language === 'en' ? 'English' : 'Chinese'}
        </span>
      </button>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        onKeyDown={(e) => handleKeyDown(e, toggleTheme)}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        aria-pressed={theme === 'dark'}
        className="flex items-center justify-center w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9E778]"
      >
        {theme === 'dark' ? (
          <>
            <Sun className="w-5 h-5 text-amber-500" aria-hidden="true" />
            <span className="sr-only">Switch to light mode</span>
          </>
        ) : (
          <>
            <Moon className="w-5 h-5 text-indigo-500" aria-hidden="true" />
            <span className="sr-only">Switch to dark mode</span>
          </>
        )}
      </button>
    </>
  );
}
