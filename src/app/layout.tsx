import type { Metadata } from "next";
import { Noto_Sans_Mono } from "next/font/google";
import "./globals.css";

const notoSansMono = Noto_Sans_Mono({
  variable: "--font-noto-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Po Agent Web",
  description: "A web interface for Pi Agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={notoSansMono.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
