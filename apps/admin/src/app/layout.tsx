import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'إدارة المنصة | سيارات',
  description: 'إدارة منصة سيارات للمعارض السعودية'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
