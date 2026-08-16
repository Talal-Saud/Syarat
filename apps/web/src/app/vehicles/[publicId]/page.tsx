import type { Metadata } from 'next';
import Link from 'next/link';
import { formatMileage, formatPrice, getVehicle, vehicles } from '../../../lib/marketplace';

export function generateStaticParams() {
  return vehicles.map((vehicle) => ({ publicId: vehicle.publicId }));
}

export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const { publicId } = await params;
  const vehicle = getVehicle(publicId);
  return { title: `${vehicle.name} ${vehicle.year} | سيارات`, description: `${vehicle.name} بسعر ${formatPrice(vehicle.price)} ريال من ${vehicle.dealer}.`, openGraph: { title: `${vehicle.name} ${vehicle.year}`, description: `${vehicle.city} · ${formatMileage(vehicle.mileage)}`, images: [vehicle.image] } };
}

export default async function VehiclePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const vehicle = getVehicle(publicId);
  return (
    <main className="detail-page"><header className="site-header detail-header"><Link href="/" className="brand-mark"><span className="brand-mark__symbol">س</span><span>سيارات</span></Link><Link href="/" className="back-link">العودة للسوق <span>←</span></Link></header><div className="detail-container"><div className="breadcrumbs"><Link href="/">الرئيسية</Link><span>←</span><span>تفاصيل السيارة</span></div><div className="detail-layout"><section className="detail-gallery"><div className="detail-main-image"><img src={vehicle.image} alt={vehicle.name} /><span className="availability availability--available">{vehicle.status}</span></div><div className="gallery-caption"><span>صورة المعرض</span><button aria-label="مشاركة السيارة">مشاركة ↗</button></div></section><section className="detail-info"><div className="detail-kicker"><span>{vehicle.condition}</span><span>تحديث {vehicle.updated}</span></div><h1>{vehicle.name}</h1><p className="detail-location">{vehicle.city} · {vehicle.dealer}</p><div className="detail-price"><strong>{formatPrice(vehicle.price)}</strong><span>ر.س</span></div><div className="detail-spec-grid"><div><span>الممشى</span><strong>{formatMileage(vehicle.mileage)}</strong></div><div><span>السنة</span><strong>{vehicle.year}</strong></div><div><span>القير</span><strong>{vehicle.transmission}</strong></div><div><span>الوقود</span><strong>{vehicle.fuel}</strong></div></div><div className="availability-box"><span className="status-dot" /> <div><strong>السيارة {vehicle.status}</strong><small>تم التأكد من التوفر {vehicle.updated}</small></div></div><div className="dealer-mini"><div className="dealer-avatar">{vehicle.dealer.slice(0, 2)}</div><div><span>المعرض</span><Link href={`/dealers/${vehicle.dealerSlug}`}>{vehicle.dealer}</Link><small>{vehicle.branch}</small></div><Link href={`/dealers/${vehicle.dealerSlug}`} className="round-arrow">←</Link></div><div className="desktop-actions"><a className="action-button action-button--whatsapp" href={`https://wa.me/${vehicle.dealerSlug === 'riyadh-motors' ? '966554458822' : '966506001830'}`}>واتساب <span>↗</span></a><a className="action-button action-button--outline" href="tel:+966554458822">اتصال</a><button className="action-button action-button--dark">طلب عرض سعر</button></div></section></div><section className="description-section"><span className="eyebrow">عن السيارة</span><h2>تفاصيل تستحق معرفتها</h2><p>سيارة مختارة بعناية من {vehicle.dealer}، مع معلومات واضحة وتوفر محدث. تواصل مع المعرض مباشرة لمعرفة تفاصيل الفحص والتمويل وحجز موعد التجربة.</p></section></div><div className="mobile-bottom-cta"><a href="https://wa.me/966554458822">واتساب</a><a href="tel:+966554458822">اتصال</a><button>طلب عرض سعر</button></div></main>
  );
}
