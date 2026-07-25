"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Container } from "@/components/layout";
import { ButtonLink } from "@/components/ui/button";
import { navigation, site } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Wordmark. The gold square is the only mark until the real logo arrives. */
function Wordmark() {
  return (
    <span className="flex flex-col leading-none">
      <span className="flex items-start gap-1.5">
        <span className="font-display text-2xl font-extrabold tracking-tight text-white">
          SKS
        </span>
        <span
          className="mt-0.5 size-2 shrink-0 bg-gold-400"
          aria-hidden="true"
        />
      </span>
      <span className="anno mt-1 text-[9px] text-navy-300">Construction</span>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /* The header sits on the same navy as the hero, so changing its background
     would not read as anything. It tightens and grows a rule instead. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = navigation.filter((item) => item.href !== "/contact");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-navy-950 transition-colors duration-300",
        scrolled ? "border-gold-400/40" : "border-navy-800",
      )}
    >
      <Container className="max-w-7xl">
        <div
          className={cn(
            "flex items-center justify-between gap-4 transition-all duration-300",
            scrolled ? "h-16" : "h-20",
          )}
        >
          <Link
            href="/"
            aria-label={`${site.name} home`}
            onClick={() => setOpen(false)}
          >
            <Wordmark />
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
                        "anno block border-b-2 px-3 py-2 transition-colors",
                        active
                          ? "border-gold-400 text-gold-300"
                          : "border-transparent text-navy-200 hover:border-navy-600 hover:text-white",
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
            className="inline-flex size-10 items-center justify-center border border-navy-700 text-white hover:border-gold-400 lg:hidden"
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
        <div id="mobile-nav" className="border-t border-navy-800 lg:hidden">
          <Container className="max-w-7xl">
            <nav aria-label="Main" className="py-5">
              <ul className="grid gap-px bg-navy-800">
                {navigation.map((item) => (
                  <li key={item.href} className="bg-navy-950">
                    <Link
                      href={item.href}
                      /* Closed here rather than on a pathname effect: the panel
                         must not still be over the page it navigated to. */
                      onClick={() => setOpen(false)}
                      className="block px-1 py-3 text-base font-semibold text-navy-100 hover:text-gold-300"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="anno mt-5 border-t border-navy-800 pt-5 text-navy-400">
                {site.serviceArea}
              </p>
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
