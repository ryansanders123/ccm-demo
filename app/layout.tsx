import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? "Donation Portal";

export const metadata: Metadata = {
  title: ORG,
  description: `${ORG} — donation management portal`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="antialiased font-sans text-stone-900">
        {children}
      </body>
    </html>
  );
}
