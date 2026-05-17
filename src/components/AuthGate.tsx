'use client';

import { useUser, SignInButton } from '@clerk/nextjs';
import { Lock } from 'lucide-react';

type Props = {
  children: React.ReactNode;
  feature: string;
  lang: 'en' | 'zh';
};

const MESSAGES = {
  signInRequired: {
    en: 'Sign in to access',
    zh: '登录以访问',
  },
  signInButton: {
    en: 'Sign In',
    zh: '登录',
  },
  professionalFeature: {
    en: 'Professional Feature',
    zh: '专业功能',
  },
};

export function AuthGate({ children, feature, lang }: Props) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="border-2 border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
          <Lock className="size-6 text-zinc-600 dark:text-zinc-400" strokeWidth={1.5} />
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
          {MESSAGES.professionalFeature[lang]}
        </p>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          {MESSAGES.signInRequired[lang]} {feature}
        </p>
        <SignInButton mode="modal">
          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 border border-zinc-950 bg-zinc-950 px-6 py-3 text-xs font-medium uppercase tracking-[0.22em] text-white transition-colors hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {MESSAGES.signInButton[lang]}
          </button>
        </SignInButton>
      </div>
    );
  }

  return <>{children}</>;
}
