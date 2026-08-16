import type { Metadata } from 'next';
import Link from 'next/link';
import { formatMileage, formatPrice, getDealer, vehicles } from '../../../lib/marketplace';

export function generateStaticParams() {
  return ['riyadh-motors', 'elite-cars', 'dar-almarkaba', 'premium-auto'].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dealer = getDealer(slug);
  return { title: `${dealer.name} | سيارات`, description: `${dealer.name} في ${dealer.city} — سيارات مختارة وخدمة مباشرة.`, openGraph: { title: dealer.name, description: dealer.description } };
}

export default async function DealerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dealer = getDealer(slug);
  const dealerVehicles = vehicles.filter((vehicle) => vehicle.dealerSlug === dealer.slug);
  return (
    <main className="dealer-page"><header className="site-header detail-header"><Link href="/" className="brand-mark"><span className="brand-mark__symbol">س</span><span>سيارات</span></Link><Link href="/" className="back-link">العودة للسوق <span>←</span></Link></header><div className="dealer-hero"><div className="dealer-hero__inner"><div className="dealer-profile"><div className="dealer-logo">{dealer.logo}</div><div><span className="eyebrow eyebrow--light">معرض معتمد</span><h1>{dealer.name}</h1><p>{dealer.city} · {dealer.branches.length} فروع</p></div></div><div className="dealer-actions"><a href={`https://wa.me/${dealer.whatsapp}`} className="action-button action-button--whatsapp">واتساب <span>↗</span></a><a href={`tel:${dealer.phone}`} className="action-button action-button--light">اتصال</a></div></div></div><div className="dealer-container"><div className="dealer-content"><section className="dealer-about"><span className="eyebrow">عن المعرض</span><h2>كل ما تحتاجه<br /><em>في مكان واحد.</em></h2><p>{dealer.description}</p><div className="dealer-facts"><div><span>الموقع</span><strong>{dealer.city}</strong></div><div><span>ساعات العمل</span><strong>{dealer.hours}</strong></div><div><span>الجوال</span><strong>{dealer.phone}</strong></div></div></section><section className="dealer-stock"><div className="section-heading"><div><span className="eyebrow">المخزون الحالي</span><h2>{dealerVehicles.length} سيارات متاحة</h2></div><Link href="/#inventory" className="text-link">كل السيارات <span>←</span></Link></div><div className="vehicle-grid">{dealerVehicles.map((vehicle) => <Link href={`/vehicles/${vehicle.publicId}`} className="vehicle-card group" key={vehicle.publicId}><div className="vehicle-card__image" style={{ background: vehicle.accent }}><img src={vehicle.image} alt={vehicle.name} loading="lazy" /><span className="availability availability--available">{vehicle.status}</span></div><div className="vehicle-card__body"><div className="vehicle-card__topline"><span>{vehicle.condition}</span><span>{vehicle.updated}</span></div><h3>{vehicle.name}</h3><div className="vehicle-card__meta"><span>{vehicle.year}</span><i /><span>{formatMileage(vehicle.mileage)}</span><i /><span>{vehicle.city}</span></div><div className="vehicle-card__footer"><strong>{formatPrice(vehicle.price)} <small>ر.س</small></strong><span className="arrow-icon">←</span></div></div></Link>)}</div></section></div><aside className="dealer-contact"><div className="contact-card"><span className="eyebrow">تواصل مع المعرض</span><h3>هل لديك سؤال؟</h3><p>فريق {dealer.name} جاهز لمساعدتك والإجابة عن استفساراتك.</p><a href={`https://wa.me/${dealer.whatsapp}`} className="contact-row"><span className="contact-icon">↗</span><span><small>واتساب</small><strong>راسلنا الآن</strong></span><b>←</b></a><a href={`tel:${dealer.phone}`} className="contact-row"><span className="contact-icon">⌕</span><span><small>اتصال مباشر</small><strong>{dealer.phone}</strong></span><b>←</b></a></div></aside></div></main>
  );
}
