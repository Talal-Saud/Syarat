import type { Metadata } from 'next';
import MarketplaceHome from './marketplace-client';

export const metadata: Metadata = {
  title: 'سياراتك القادمة تبدأ من هنا | سيارات',
  description: 'اكتشف سيارات موثوقة من معارض معتمدة في السعودية، وقارن بهدوء حتى تصل إلى الاختيار المناسب لك.',
  openGraph: {
    title: 'سياراتك القادمة تبدأ من هنا | سيارات',
    description: 'السوق السعودي للسيارات من المعارض الموثوقة.',
    type: 'website',
    locale: 'ar_SA'
  }
};

export default function HomePage() {
  return <MarketplaceHome />;
}
