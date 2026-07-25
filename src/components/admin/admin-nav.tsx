"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/quotes", label: "Quotes" },
  { href: "/admin/clients", label: "Clients" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="border-t border-navy-700">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-block border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap",
                    active
                      ? "border-gold-400 text-white"
                      : "border-transparent text-navy-200 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
