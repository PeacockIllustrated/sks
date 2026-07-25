import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { signOut } from "@/app/sign-in/actions";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s - SKS admin" },
  robots: { index: false, follow: false },
};

/**
 * Every admin route is gated here rather than only in the proxy. The proxy
 * refreshes the session; this is what actually decides who gets in, and it
 * runs on the server for each request.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff();

  return (
    <div className="flex min-h-screen flex-col bg-navy-50">
      <header className="border-b border-navy-700 bg-navy-800 text-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-baseline gap-3">
            <Link href="/admin" className="font-display text-lg font-bold">
              SKS
            </Link>
            <span className="text-xs tracking-[0.2em] text-gold-300 uppercase">
              Operations
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-navy-200 sm:inline">
              {user.fullName ?? user.email}
              <span className="ml-2 border border-navy-600 px-2 py-0.5 text-xs text-gold-300">
                {user.role === "OWNER" ? "Owner" : "Staff"}
              </span>
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="border border-navy-600 px-3 py-1.5 text-sm text-navy-100 hover:border-white hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
