import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "GAMEHUB ARCADIA - Platform Ekosistem Gamer",
  description: "Platform gaming multi-game terlengkap. Cari teman mabar, ikut tournament, kumpulkan points dan dapatkan reward menarik!",
  keywords: "gaming, esports, tournament, party finder, mabar, arcadia",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="bg-grid">
        <AppProvider>
          <ToastContainer />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}

function ToastContainer() {
  'use client';
  return <ToastUI />;
}

function ToastUI() {
  return null; // Toast is rendered inline via the layout components
}
