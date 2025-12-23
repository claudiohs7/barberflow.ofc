
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const isBookingPage = pathname.startsWith("/agendar");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-sm">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline">BarberFlow</span>
          </Link>
          {!isBookingPage && (
            <nav className="hidden space-x-6 text-sm font-medium md:flex">
              <Link
                href="/#features"
                className="transition-colors hover:text-primary text-foreground/60"
              >
                Funcionalidades
              </Link>
              <Link
                href="/#pricing"
                className="transition-colors hover:text-primary text-foreground/60"
              >
                Preços
              </Link>
              <Link
                href="/#how-it-works"
                className="transition-colors hover:text-primary text-foreground/60"
              >
                Como Funciona
              </Link>
            </nav>
          )}
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
           <nav className="hidden md:flex items-center space-x-2">
            <Button variant="ghost" asChild className="transition-transform duration-300 hover:scale-105">
              <Link href="/auth/login">Entrar</Link>
            </Button>
            <Button
              asChild
              className="bg-primary text-primary-foreground transition-transform duration-300 hover:scale-105 hover:bg-primary/90 hover:shadow-lg"
            >
              <Link href="/auth/admin/register">Comecar</Link>
            </Button>
          </nav>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
              >
                <Menu className="h-5 w-5" suppressHydrationWarning />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4">
                {!isBookingPage && (
                  <>
                    <Link
                      href="/#features"
                      className="block px-2 py-1 text-lg"
                    >
                      Funcionalidades
                    </Link>
                    <Link
                      href="/#pricing"
                      className="block px-2 py-1 text-lg"
                    >
                      Preços
                    </Link>
                    <Link
                      href="/#how-it-works"
                      className="block px-2 py-1 text-lg"
                    >
                      Como Funciona
                    </Link>
                  </>
                )}
                <div className="flex flex-col gap-2 pt-4">
                    <Button variant="ghost" asChild>
                        <Link href="/auth/login">Entrar</Link>
                    </Button>
                    <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Link href="/auth/admin/register">Comecar</Link>
                    </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
