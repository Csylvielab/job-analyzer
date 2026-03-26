import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "JobInsight AI - 智能求职分析平台",
  description: "AI驱动的岗位分析与简历优化平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground relative">
        <Providers>
          {/* Background Effects */}
          <div className="spotlight" />
          <div className="grid-background" />
          {children}
        </Providers>
      </body>
    </html>
  );
}
