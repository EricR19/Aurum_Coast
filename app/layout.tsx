import type { Metadata, Viewport } from 'next';
import { Montserrat, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { MetaPixel } from '@/components/providers/MetaPixel';

const fontTitle = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-title',
  display: 'swap',
});

const fontBody = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AURUM COAST — Relojes de alta gama',
  description:
    'Catálogo inmersivo de relojes: Seiko, Tissot, Casio. Compra directo por WhatsApp con SINPE Móvil o contra entrega.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AURUM COAST',
  },
  icons: {
    apple: '/banners/aurum-coast-logo-clean-960.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${fontTitle.variable} ${fontBody.variable}`}>
      <body className="font-body text-white antialiased">
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}
