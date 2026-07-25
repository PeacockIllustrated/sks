import Link from "next/link";

/** Minimal shell for sign-in. No marketing nav, no admin nav. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-navy-50">
      <header className="border-b border-navy-700 bg-navy-800 text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-4 sm:px-8">
          <Link href="/" className="font-display text-lg font-bold">
            SKS
          </Link>
          <span className="text-xs tracking-[0.2em] text-gold-300 uppercase">
            Construction
          </span>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
