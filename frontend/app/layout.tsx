import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Safecast AI — Public Safety Data Platform",
  description: "Transforming Raw Safety Data into Actionable Intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca" className="dark">
      <body className={`${inter.className} antialiased`}>
        <AppShell>
          {/* Scrollable page content */}
          <div className="flex-1 overflow-y-auto">
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
