import type { Metadata } from "next";
import { Merriweather, Public_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from "@/components/layout/AppShell";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Safecast AI — Public Safety Data Platform",
  description: "Transforming Raw Safety Data into Actionable Intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca">
      <body className={`${publicSans.variable} ${merriweather.variable} font-sans antialiased`}>
        <AppShell>
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="p-6 max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </AppShell>
        <Toaster />
      </body>
    </html>
  );
}
