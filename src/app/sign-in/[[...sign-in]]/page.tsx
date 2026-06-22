import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="w-full max-w-md">
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-zinc-900 border border-zinc-800 shadow-2xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-zinc-400',
              socialButtonsBlockButton: 'border-zinc-700 hover:bg-zinc-800',
              formButtonPrimary: 'bg-[#E9E778] text-black hover:bg-[#d4d265]',
              footerActionLink: 'text-[#E9E778] hover:text-[#d4d265]',
              formFieldLabel: 'text-zinc-300',
              formFieldInput: 'bg-zinc-800 border-zinc-700 text-white',
              identityPreviewText: 'text-zinc-300',
              identityPreviewEditButton: 'text-[#E9E778]',
            },
          }}
        />
      </div>
    </div>
  );
}
