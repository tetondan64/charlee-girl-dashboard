import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Charlee Girl Dashboard",
  description: "Business tools dashboard for Charlee Girl boho yoga brand",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
