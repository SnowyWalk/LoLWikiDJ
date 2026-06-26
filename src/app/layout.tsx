import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoLWikiDJ2",
  description: "Next.js migration of LoLWikiDJ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
