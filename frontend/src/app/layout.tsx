import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { PRODUCT_NAME, PRODUCT_SUBTITLE } from "@/lib/chat/constants";
import "./globals.css";

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const displayFont = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: `${PRODUCT_SUBTITLE}. Ask about admissions, tuition, programmes, offices, and student services.`,
  applicationName: PRODUCT_NAME,
  authors: [{ name: "Akademia Techniczno-Artystyczna" }],
  keywords: [
    "ATA",
    "university assistant",
    "admissions",
    "tuition",
    "scholarships",
    "Akademia Techniczno-Artystyczna",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#1c3557",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} overflow-x-hidden antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
