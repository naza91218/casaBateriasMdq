import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';

const barlow = Barlow({
  subsets: ['latin'],
  // Solo los pesos que usa la tienda: texto (500), rótulos (600) y botones y títulos (700).
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-barlow',
});

const condensada = Barlow_Condensed({
  subsets: ['latin'],
  // 800 para titulares, y su itálica para la etiqueta del slogan.
  weight: '800',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-condensada',
});

export const metadata: Metadata = {
  title: {
    default: 'La Casa de las Baterías · Baterías para tu auto en Mar del Plata',
    template: '%s · La Casa de las Baterías',
  },
  description:
    'Buscá la batería de tu auto por marca, modelo y año. Te la colocamos en Mar del Plata, con 12 meses de garantía. 45 años en el mercado.',
};

export const viewport: Viewport = { themeColor: '#0b0b0b' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${barlow.variable} ${condensada.variable}`}>
      <body>{children}</body>
    </html>
  );
}
