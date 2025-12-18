
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ClientOnly } from "@/components/client-only";
import { AuthProvider } from "@/context/AuthContext";
import { Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "optional",
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "optional",
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "BarberFlow",
  description: "A forma moderna de gerenciar sua barbearia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${spaceGrotesk.variable} dark scroll-smooth`}
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
          <ClientOnly>
            <Toaster />
          </ClientOnly>
        </AuthProvider>
      </body>
    </html>
  );
}
