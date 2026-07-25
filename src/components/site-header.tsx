"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Container } from "@/components/layout";
import { ButtonLink } from "@/components/ui/button";
import { navigation, site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = navigation.filter((item) => item.href !== "/contact");

  return (
    <header className="sticky top-0 z-40 border-b border-navy-700 bg-navy-800 text-white">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 sm:h-20">
          <Link
            href="/"
            className="flex items-baseline gap-2"
            onClick={() => setOpen(false)}
          >
            {/* Wordmark stands in until the real logo arrives. */}
            <span className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              SKS
            </span>
            <span className="text-xs font-medium tracking-[0.2em] text-gold-300 uppercase">
              Construction
            </span>
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {links.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "text-gold-300"
                          : "text-navy-100 hover:text-white",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <ButtonLink href="/contact" size="sm">
              Request a quote
            </ButtonLink>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center border border-navy-600 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </Container>

      {open ? (
        <div id="mobile-nav" className="border-t border-navy-700 lg:hidden">
          <Container>
            <nav aria-label="Main" className="py-4">
              <ul className="space-y-1">
                {navigation.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block px-1 py-2.5 text-base font-medium text-navy-100 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-navy-700 pt-4 text-sm text-navy-300">
                {site.serviceArea}
              </p>
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
