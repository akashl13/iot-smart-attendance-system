import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  axes: ["opsz"],
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmartAttend · IoT-Based Smart Attendance System",
  description:
    "Automated RFID attendance powered by IoT, cloud connectivity and real-time analytics.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plex.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
