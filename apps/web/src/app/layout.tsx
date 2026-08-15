import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'سيارات',
  description: 'Marketplace موحد لمعارض السيارات السعودية'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
