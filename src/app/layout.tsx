import type { Metadata, Viewport } from "next";
import { Inter, Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { copy } from "@/content/copy";
import { LocaleProvider } from "@/content/i18n";
import { getLocale, getTexts } from "@/content/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", weight: ["600", "800"] });

/** Tab title and description follow the interface language; share cards stay English (US product). */
export async function generateMetadata(): Promise<Metadata> {
  const { copy: local } = await getTexts();
  return {
    title: `${local.brand.name} — ${local.brand.tagline}`,
    description: local.landing.subtitle,
    openGraph: { title: copy.brand.name, description: copy.brand.tagline, siteName: copy.brand.name, type: "website" },
    twitter: { card: "summary_large_image", title: copy.brand.name, description: copy.brand.tagline },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FBF7F1",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${nunito.variable}`}>
      <body>
        <LocaleProvider locale={locale}>
          <Header />
          <main>{children}</main>
          <Footer />
          <BottomNav />
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
