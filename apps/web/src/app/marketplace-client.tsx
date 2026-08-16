'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { brandNames, cities, formatMileage, formatPrice, type Vehicle, vehicles } from '../lib/marketplace';

type FilterState = { city: string; condition: string; brand: string; sort: string };

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Link href={`/vehicles/${vehicle.publicId}`} className="vehicle-card group">
      <div className="vehicle-card__image" style={{ background: vehicle.accent }}>
        <img src={vehicle.image} alt={vehicle.name} loading="lazy" />
        <span className={`availability availability--${vehicle.status === 'متاحة' ? 'available' : 'reserved'}`}>{vehicle.status}</span>
        <span className="card-heart" aria-label="إضافة إلى المفضلة">♡</span>
      </div>
      <div className="vehicle-card__body">
        <div className="vehicle-card__topline"><span>{vehicle.condition}</span><span>{vehicle.updated}</span></div>
        <h3>{vehicle.name}</h3>
        <div className="vehicle-card__meta"><span>{vehicle.year}</span><i /> <span>{formatMileage(vehicle.mileage)}</span><i /> <span>{vehicle.city}</span></div>
        <div className="vehicle-card__footer"><strong>{formatPrice(vehicle.price)} <small>ر.س</small></strong><span className="arrow-icon" aria-hidden="true">←</span></div>
      </div>
    </Link>
  );
}

function FilterPanel({ filters, setFilters, onClose, mobile = false }: { filters: FilterState; setFilters: (next: FilterState) => void; onClose?: () => void; mobile?: boolean }) {
  const update = (key: keyof FilterState, value: string) => setFilters({ ...filters, [key]: value });
  return (
    <div className={mobile ? 'filter-drawer__content' : 'filter-panel'}>
      {mobile && <div className="drawer-heading"><div><span className="eyebrow">تخصيص البحث</span><h2>الفلاتر</h2></div><button className="close-button" onClick={onClose} aria-label="إغلاق الفلاتر">×</button></div>}
      <label className="filter-field"><span>المدينة</span><select value={filters.city} onChange={(event) => update('city', event.target.value)}><option value="">كل المدن</option>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
      <div className="filter-field"><span>حالة السيارة</span><div className="segmented"><button className={filters.condition === '' ? 'active' : ''} onClick={() => update('condition', '')}>الكل</button><button className={filters.condition === 'جديدة' ? 'active' : ''} onClick={() => update('condition', 'جديدة')}>جديدة</button><button className={filters.condition === 'مستعملة' ? 'active' : ''} onClick={() => update('condition', 'مستعملة')}>مستعملة</button></div></div>
      <label className="filter-field"><span>الماركة</span><select value={filters.brand} onChange={(event) => update('brand', event.target.value)}><option value="">كل الماركات</option>{brandNames.map((brand) => <option key={brand}>{brand}</option>)}</select></label>
      <label className="filter-field"><span>الترتيب</span><select value={filters.sort} onChange={(event) => update('sort', event.target.value)}><option value="newest">الأحدث أولاً</option><option value="price_asc">السعر: الأقل</option><option value="price_desc">السعر: الأعلى</option><option value="mileage_asc">الممشى: الأقل</option></select></label>
      {mobile && <button className="primary-button drawer-apply" onClick={onClose}>عرض النتائج</button>}
    </div>
  );
}

function ResultsSection() {
  const [filters, setFilters] = useState<FilterState>({ city: '', condition: '', brand: '', sort: 'newest' });
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filteredVehicles = useMemo(() => {
    const result = vehicles.filter((vehicle) => (!filters.city || vehicle.city === filters.city) && (!filters.condition || vehicle.condition === filters.condition) && (!filters.brand || vehicle.brand === filters.brand) && (!search || `${vehicle.name} ${vehicle.brand} ${vehicle.model}`.includes(search)));
    return [...result].sort((a, b) => filters.sort === 'price_asc' ? a.price - b.price : filters.sort === 'price_desc' ? b.price - a.price : filters.sort === 'mileage_asc' ? a.mileage - b.mileage : 0);
  }, [filters, search]);
  return (
    <section className="results-section" id="inventory">
      <div className="section-heading"><div><span className="eyebrow">مختارات السوق</span><h2>سيارات تستحق نظرة</h2></div><Link href="/vehicles" className="text-link">عرض كل السيارات <span>←</span></Link></div>
      <div className="search-results-layout">
        <aside><FilterPanel filters={filters} setFilters={setFilters} /></aside>
        <div className="results-main">
          <div className="results-toolbar"><div><strong>{filteredVehicles.length} سيارة</strong><span className="muted"> في السوق الآن</span></div><div className="results-toolbar__actions"><label className="inline-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في النتائج" aria-label="البحث في النتائج" /></label><div className="mobile-toolbar"><button className="filter-toggle" onClick={() => setDrawerOpen(true)}>☷ الفلاتر</button><select aria-label="ترتيب النتائج" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="newest">الأحدث</option><option value="price_asc">الأقل سعراً</option><option value="price_desc">الأعلى سعراً</option></select></div></div></div>\n          <div className="vehicle-grid">{filteredVehicles.map((vehicle) => <VehicleCard key={vehicle.publicId} vehicle={vehicle} />)}</div>
          {filteredVehicles.length === 0 && <div className="empty-state"><span>⌕</span><h3>لم نجد سيارات بهذه المواصفات</h3><p>جرّب تغيير المدينة أو الماركة لتوسيع نتائجك.</p></div>}
        </div>
      </div>
      {drawerOpen && <div className="drawer-backdrop" role="presentation" onClick={() => setDrawerOpen(false)}><div className="filter-drawer" role="dialog" aria-modal="true" aria-label="فلاتر البحث" onClick={(event) => event.stopPropagation()}><FilterPanel filters={filters} setFilters={setFilters} onClose={() => setDrawerOpen(false)} mobile /></div></div>}
    </section>
  );
}

export default function MarketplaceHome() {
  const [heroSearch, setHeroSearch] = useState('');
  return (
    <>
      <header className="site-header"><Link href="/" className="brand-mark"><span className="brand-mark__symbol">س</span><span>سيارات</span></Link><nav><Link href="#inventory">السيارات</Link><Link href="/dealers/riyadh-motors">المعارض</Link><Link href="#how-it-works">كيف يعمل؟</Link></nav><div className="header-actions"><button className="saved-button" aria-label="المفضلة">♡ <span>المفضلة</span></button><Link href="#inventory" className="header-cta">ابدأ البحث <span>←</span></Link></div></header>
      <main>
        <section className="hero-shell"><div className="hero-copy"><span className="eyebrow eyebrow--light">السوق السعودي للسيارات</span><h1>سيارتك القادمة<br /><em>تبدأ من هنا.</em></h1><p>اكتشف سيارات موثوقة من معارض معتمدة، وقارن بهدوء حتى تصل إلى الاختيار المناسب لك.</p><div className="hero-trust"><span><b>01</b> معارض موثوقة</span><span><b>02</b> خيارات أكثر</span><span><b>03</b> تجربة أسهل</span></div></div><div className="hero-visual"><div className="hero-orb" /><img src="https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1300&q=86" alt="سيارة حديثة في السوق السعودي" /><div className="hero-note"><strong>+2,400</strong><span>سيارة متاحة<br />هذا الأسبوع</span></div></div><div className="hero-search"><div className="search-input"><span className="search-icon">⌕</span><input value={heroSearch} onChange={(event) => setHeroSearch(event.target.value)} placeholder="ابحث عن ماركة، موديل أو مدينة" aria-label="البحث عن سيارة" /><kbd>⌘ K</kbd></div><select aria-label="اختيار المدينة"><option>كل المدن</option>{cities.slice(0, 5).map((city) => <option key={city}>{city}</option>)}</select><button className="primary-button" onClick={() => document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' })}>ابحث الآن <span>←</span></button></div></section>
        <section className="quick-nav"><div className="quick-nav__label">تصفح حسب</div><div className="quick-tabs"><a href="#inventory">كل السيارات <span>2,400</span></a><a href="#inventory">جديدة <span>340</span></a><a href="#inventory">مستعملة <span>2,060</span></a></div><div className="quick-brands">{brandNames.slice(0, 5).map((brand) => <button key={brand} onClick={() => document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' })}>{brand}</button>)}</div></section>
        <ResultsSection />
        <section className="trust-strip" id="how-it-works"><div><span className="trust-number">01</span><h3>اختر بهدوء</h3><p>قارن بين آلاف السيارات من مكان واحد.</p></div><div><span className="trust-number">02</span><h3>تواصل مباشرة</h3><p>معرض موثوق، معلومات واضحة، بلا وسطاء.</p></div><div><span className="trust-number">03</span><h3>قدها بثقة</h3><p>قرارك يبدأ من بيانات دقيقة ومحدثة.</p></div></section>
      </main>
      <footer className="site-footer"><div className="brand-mark"><span className="brand-mark__symbol">س</span><span>سيارات</span></div><p>تجربة أبسط لشراء سيارتك القادمة.</p><span>© 2026 سيارات</span></footer>
    </>
  );
}
