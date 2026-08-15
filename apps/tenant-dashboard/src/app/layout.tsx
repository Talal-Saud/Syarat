import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'لوحة المعرض | سيارات',
  description: 'لوحة SaaS لإدارة مخزون المعرض والعملاء المحتملين'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
