import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Flow Mama Northfields",
    template: "%s — Flow Mama Northfields",
  },
  description:
    "Book Flow Mama mother and baby movement and social sessions in Northfields.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
