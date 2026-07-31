import type { Metadata } from "next";
import "./globals.css";
import styles from "./layout.module.css";
import { Providers } from "../components/Providers";
import { HeaderActions } from "../components/HeaderActions";
import { SearchBar } from "../components/SearchBar";
import { NewsletterPopup } from "../components/NewsletterPopup";

import { createClient } from "../lib/supabase-server";
import { cookies } from "next/headers";
import BannedScreen from "../components/BannedScreen";

export async function generateMetadata(): Promise<Metadata> {
  const supabaseServer = await createClient();
  const { data: settings } = await supabaseServer.from('store_settings').select('store_name').eq('id', 1).single();
  const storeName = settings?.store_name || "CJThreads";

  return {
    title: `${storeName} | Vintage & Secondhand Fashion`,
    description: `Buy secondhand clothes online. Affordable branded fashion, vintage streetwear, and Y2K fashion at ${storeName}.`,
    openGraph: {
      title: `${storeName} | Vintage & Secondhand Fashion`,
      description: `Buy secondhand clothes online. Affordable branded fashion, vintage streetwear, and Y2K fashion at ${storeName}.`,
      url: "https://cjthreads.com",
      siteName: storeName,
      images: [
        {
          url: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=1200&auto=format&fit=crop", // placeholder OG image
          width: 1200,
          height: 630,
          alt: `${storeName} Vintage Collection`,
        },
      ],
      locale: "en_GB",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${storeName} | Vintage & Secondhand Fashion`,
      description: `Buy secondhand clothes online. Affordable branded fashion, vintage streetwear, and Y2K fashion at ${storeName}.`,
      images: ["https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=1200&auto=format&fit=crop"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isBrowserBanned = cookieStore.get('browser_banned')?.value === 'true';
  let isAccountBanned = false;

  if (!isBrowserBanned) {
    const supabaseServer = await createClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    if (session) {
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('status')
        .eq('id', session.user.id)
        .single();
        
      if (profile?.status === 'banned') {
        isAccountBanned = true;
      }
    }
  }

  if (isBrowserBanned || isAccountBanned) {
    return (
      <html lang="en">
        <body>
          <BannedScreen />
        </body>
      </html>
    );
  }

  const supabaseForSettings = await createClient();
  const { data: settings } = await supabaseForSettings.from('store_settings').select('store_name').eq('id', 1).single();
  const storeName = settings?.store_name || "CJThreads";
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          <header className={styles.header}>
            <div className="container">
            <div className={styles.navbar}>
              <div className={styles.logo}>
                <a href="/">{storeName}</a>
              </div>
              <nav className={styles.navLinks}>
                <a href="/category/men">Men</a>
                <a href="/category/women">Women</a>
                <a href="/category/kids">Kids</a>
                <a href="/category/sale" className={styles.saleLink}>Sale</a>
              </nav>
              <div className={styles.actions}>
                <SearchBar />
                <HeaderActions />
              </div>
            </div>
          </div>
        </header>
        <main className={styles.main}>
          {children}
        </main>
        <footer className={styles.footer}>
          <div className="container">
            <div className={styles.footerContent}>
              <p>&copy; {new Date().getFullYear()} {storeName}. All rights reserved.</p>
              <div className={styles.footerLinks}>
                <a href="/terms">Terms & Conditions</a>
              </div>
              <div className={styles.socialMedia}>
                {/* Placeholders for social media icons */}
                <a href="#" aria-label="Facebook">
                  <img src="/brand_images/facebook-square-icon.svg" alt="Facebook" width={24} height={24} />
                </a>
                <a href="#" aria-label="Instagram">
                  <img src="/brand_images/ig-instagram-icon.svg" alt="Instagram" width={24} height={24} />
                </a>
              </div>
            </div>
          </div>
        </footer>
        <NewsletterPopup />
        </Providers>
      </body>
    </html>
  );
}
