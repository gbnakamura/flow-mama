import type { Metadata } from "next";
import { Nunito, Jost } from "next/font/google";
import { SiteAnalytics } from "@/components/site-analytics";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const jost = Jost({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Flow Mama Northfields",
    template: "%s — Flow Mama Northfields",
  },
  description:
    "Book Flow Mama mother and baby movement and social sessions in Northfields.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon-48.png", sizes: "48x48", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${nunito.variable} ${jost.variable}`}>
      <body>{children}<SiteAnalytics /></body>
    </html>
  );
}
