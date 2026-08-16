'use client';

import { useMemo, useState } from 'react';

type Section = 'dashboard' | 'inventory' | 'leads' | 'employees' | 'branch' | 'settings';
type Permission = 'dashboard.view' | 'vehicles.view' | 'vehicles.manage' | 'leads.view' | 'leads.manage' | 'employees.manage' | 'branches.manage';
type LeadStatus = 'جديد' | 'تم التواصل' | 'مهتم' | 'موعد' | 'تم البيع' | 'مفقود';

type Vehicle = { id: string; name: string; stock: string; year: number; price: string; mileage: string; status: string; availability: 'متاحة' | 'محجوزة' | 'مباعة'; updated: string };
type Lead = { id: string; name: string; vehicle: string; phone: string; status: LeadStatus; assigned: string; time: string };

const permissions: Record<Permission, boolean> = {
  'dashboard.view': true,
  'vehicles.view': true,
  'vehicles.manage': true,
  'leads.view': true,
  'leads.manage': true,
  'employees.manage': true,
  'branches.manage': true
};

const navigation: { id: Section; label: string; icon: string; permission?: Permission }[] = [
  { id: 'dashboard', label: 'لوحة المتابعة', icon: '⌂', permission: 'dashboard.view' },
  { id: 'inventory', label: 'المخزون', icon: '▦', permission: 'vehicles.view' },
  { id: 'leads', label: 'العملاء المحتملون', icon: '◌', permission: 'leads.view' },
  { id: 'employees', label: 'الموظفون', icon: '♙', permission: 'employees.manage' },
  { id: 'branch', label: 'الفرع', icon: '⌖', permission: 'branches.manage' },
  { id: 'settings', label: 'الإعدادات', icon: '⚙' }
];

const vehicles: Vehicle[] = [
  { id: '1', name: 'تويوتا كامري GLE', stock: 'SY-2048', year: 2025, price: '124,500', mileage: '18,400 كم', status: 'منشورة', availability: 'متاحة', updated: 'منذ ساعتين' },
  { id: '2', name: 'لكزس ES 350', stock: 'SY-2037', year: 2024, price: '218,000', mileage: '31,200 كم', status: 'منشورة', availability: 'محجوزة', updated: 'منذ 5 ساعات' },
  { id: '3', name: 'هيونداي توسان Premium', stock: 'SY-2029', year: 2023, price: '98,750', mileage: '42,100 كم', status: 'منشورة', availability: 'متاحة', updated: 'أمس' },
  { id: '4', name: 'فورد إكسبلورر XLT', stock: 'SY-2015', year: 2022, price: '145,000', mileage: '61,800 كم', status: 'مسودة', availability: 'متاحة', updated: 'منذ 3 أيام' }
];

const leads: Lead[] = [
  { id: 'LD-842', name: 'عبدالرحمن العتيبي', vehicle: 'تويوتا كامري GLE 2025', phone: '055 *** 2381', status: 'جديد', assigned: 'غير معين', time: 'منذ 18 دقيقة' },
  { id: 'LD-841', name: 'نورة القحطاني', vehicle: 'لكزس ES 350 2024', phone: '050 *** 7612', status: 'تم التواصل', assigned: 'سارة محمد', time: 'منذ ساعتين' },
  { id: 'LD-839', name: 'محمد الحربي', vehicle: 'هيونداي توسان Premium', phone: '056 *** 4402', status: 'موعد', assigned: 'خالد صالح', time: 'أمس' }
];

const statusTone: Record<string, string> = { متاحة: 'positive', محجوزة: 'warning', مباعة: 'muted', منشورة: 'positive', مسودة: 'neutral', جديد: 'accent', 'تم التواصل': 'info', مهتم: 'accent', موعد: 'warning', 'تم البيع': 'positive', مفقود: 'muted' };

function can(permission: Permission) { return permissions[permission]; }

export default function HomePage() {
  const [section, setSection] = useState<Section>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [inventoryTab, setInventoryTab] = useState('كل السيارات');
  const [leadFilter, setLeadFilter] = useState('كل الحالات');
  const visibleNavigation = navigation.filter((item) => !item.permission || can(item.permission));

  const title = navigation.find((item) => item.id === section)?.label ?? 'لوحة المتابعة';

  return (
    <div className="dashboard-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><span className="brand-mark">س</span><div><strong>سيارات</strong><small>لوحة المعرض</small></div></div>
        <div className="tenant-switcher"><span className="tenant-avatar">م</span><div><strong>معرض مسار النخبة</strong><small>الرياض · الفرع الرئيسي</small></div><span className="chevron">⌄</span></div>
        <nav className="side-nav" aria-label="التنقل الرئيسي">
          <small className="nav-label">مساحة العمل</small>
          {visibleNavigation.map((item) => <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => { setSection(item.id); setMobileNavOpen(false); }}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.id === 'leads' && <b className="nav-count">3</b>}</button>)}
        </nav>
        <div className="sidebar-footer"><div className="help-card"><span className="help-icon">?</span><div><strong>تحتاج مساعدة؟</strong><small>فريق الدعم متاح لك</small></div></div><button className="user-profile"><span className="user-avatar">ع</span><span><strong>عبدالله السالم</strong><small>مالك المعرض</small></span><span className="more">⋮</span></button></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="فتح القائمة">☰</button><div><p className="eyebrow">الأحد، ١٦ أغسطس ٢٠٢٦</p><h1>{title}</h1></div><div className="top-actions"><button className="icon-button" aria-label="الإشعارات">♧<span className="notification-dot" /></button><button className="support-button">مركز المساعدة <span>↗</span></button></div></header>
        {section === 'dashboard' && <Dashboard onNavigate={setSection} />}
        {section === 'inventory' && <Inventory tab={inventoryTab} setTab={setInventoryTab} />}
        {section === 'leads' && <Leads filter={leadFilter} setFilter={setLeadFilter} />}
        {section === 'employees' && <Employees />}
        {section === 'branch' && <Branch />}
        {section === 'settings' && <Settings />}
      </main>
      <nav className="mobile-bottom-nav" aria-label="التنقل السريع">{visibleNavigation.slice(0, 4).map((item) => <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}><span>{item.icon}</span>{item.label.split(' ')[0]}</button>)}</nav>
    </div>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (section: Section) => void }) {
  return <div className="page-stack">
    <section className="welcome-panel"><div><span className="section-kicker">صباح الخير، عبدالله</span><h2>ما الذي يحتاج انتباهي اليوم؟</h2><p>نظرة سريعة على أهم ما يحدث في معرضك.</p></div><div className="welcome-art"><span>✦</span><span>◒</span><span>✧</span></div></section>
    <section className="metric-grid"><Metric icon="◌" label="Leads جديدة" value="12" note="+4 منذ أمس" tone="teal" onClick={() => onNavigate('leads')} /><Metric icon="◷" label="تحتاج متابعة" value="7" note="منذ أكثر من 24 ساعة" tone="orange" onClick={() => onNavigate('leads')} /><Metric icon="↻" label="تأكيد التوفر" value="5" note="يستحق التأكيد اليوم" tone="purple" onClick={() => onNavigate('inventory')} /><Metric icon="▣" label="سيارات محجوزة" value="3" note="بقيمة 287,500 ر.س" tone="blue" onClick={() => onNavigate('inventory')} /></section>
    <div className="content-grid"><section className="panel"><div className="panel-heading"><div><span className="section-kicker">يحتاج إجراء</span><h3>قائمة اليوم</h3></div><button className="text-button" onClick={() => onNavigate('inventory')}>عرض الكل <span>←</span></button></div><div className="attention-list"><Attention icon="◌" title="لديك 7 عملاء لم تتم متابعتهم" detail="أقرب Lead منذ 26 ساعة" action="متابعة الـLeads" onClick={() => onNavigate('leads')} tone="teal" /><Attention icon="↻" title="5 سيارات تحتاج تأكيد التوفر" detail="آخر تأكيد كان قبل 7 أيام" action="مراجعة السيارات" onClick={() => onNavigate('inventory')} tone="purple" /><Attention icon="▣" title="موعد استلام سيارة غداً" detail="لكزس ES 350 · LD-841" action="فتح التفاصيل" onClick={() => onNavigate('leads')} tone="orange" /></div></section><section className="panel activity-panel"><div className="panel-heading"><div><span className="section-kicker">آخر التحديثات</span><h3>نشاط المعرض</h3></div><button className="icon-button subtle" aria-label="المزيد">⋮</button></div><div className="activity-list"><Activity avatar="ع" text="أضاف عبدالله سيارة جديدة" detail="تويوتا كامري GLE 2025" time="منذ ساعتين" /><Activity avatar="س" text="تم تعيين Lead جديد إلى سارة" detail="نورة القحطاني · لكزس ES 350" time="منذ 3 ساعات" /><Activity avatar="خ" text="تم تحديث حالة السيارة" detail="هيونداي توسان · متاحة" time="أمس" /></div></section></div>
    <section className="panel"><div className="panel-heading"><div><span className="section-kicker">المخزون</span><h3>أحدث السيارات</h3></div><button className="text-button" onClick={() => onNavigate('inventory')}>إدارة المخزون <span>←</span></button></div><div className="vehicle-mini-grid">{vehicles.slice(0, 3).map((vehicle) => <VehicleRow key={vehicle.id} vehicle={vehicle} />)}</div></section>
  </div>;
}

function Metric({ icon, label, value, note, tone, onClick }: { icon: string; label: string; value: string; note: string; tone: string; onClick: () => void }) { return <button className="metric-card" onClick={onClick}><span className={`metric-icon ${tone}`}>{icon}</span><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small><span className="metric-arrow">←</span></button>; }
function Attention({ icon, title, detail, action, tone, onClick }: { icon: string; title: string; detail: string; action: string; tone: string; onClick: () => void }) { return <div className="attention-item"><span className={`attention-icon ${tone}`}>{icon}</span><div className="attention-copy"><strong>{title}</strong><small>{detail}</small></div><button onClick={onClick}>{action} <span>←</span></button></div>; }
function Activity({ avatar, text, detail, time }: { avatar: string; text: string; detail: string; time: string }) { return <div className="activity-item"><span className="small-avatar">{avatar}</span><div><strong>{text}</strong><small>{detail}</small></div><time>{time}</time></div>; }
function VehicleRow({ vehicle }: { vehicle: Vehicle }) { return <div className="vehicle-row"><span className="vehicle-thumb"><span>س</span></span><div className="vehicle-name"><strong>{vehicle.name}</strong><small>{vehicle.year} · {vehicle.mileage} · {vehicle.stock}</small></div><strong className="vehicle-price">{vehicle.price} <small>ر.س</small></strong><span className={`badge ${statusTone[vehicle.availability]}`}>{vehicle.availability}</span></div>; }

function Inventory({ tab, setTab }: { tab: string; setTab: (tab: string) => void }) { const tabs = ['كل السيارات', 'متاحة', 'محجوزة', 'تحتاج تأكيد']; const filtered = tab === 'كل السيارات' ? vehicles : vehicles.filter((v) => tab === v.availability || (tab === 'تحتاج تأكيد' && v.id === '4')); return <div className="page-stack"><div className="page-intro"><div><span className="section-kicker">إدارة السيارات</span><h2>المخزون</h2><p>تابع سيارات المعرض وحدّث حالتها وتفاصيلها من مكان واحد.</p></div><div className="intro-actions"><button className="secondary-button">استيراد Excel</button>{can('vehicles.manage') && <button className="primary-button">+ إضافة سيارة</button>}</div></div><div className="toolbar"><div className="tabs">{tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}{item === 'تحتاج تأكيد' && <b>5</b>}</button>)}</div><div className="toolbar-search">⌕ <input placeholder="ابحث برقم المخزون أو اسم السيارة" aria-label="البحث في المخزون" /></div></div><section className="panel table-panel"><div className="table-head"><span>السيارة</span><span>السعر</span><span>الحالة</span><span>آخر تحديث</span><span /></div>{filtered.map((vehicle) => <div className="inventory-row" key={vehicle.id}><div className="vehicle-row"><span className="vehicle-thumb"><span>س</span></span><div className="vehicle-name"><strong>{vehicle.name}</strong><small>{vehicle.year} · {vehicle.mileage} · {vehicle.stock}</small></div></div><strong className="vehicle-price">{vehicle.price} <small>ر.س</small></strong><span className={`badge ${statusTone[vehicle.availability]}`}>{vehicle.availability}</span><small className="updated-text">{vehicle.updated}</small><button className="row-menu" aria-label={`خيارات ${vehicle.name}`}>⋮</button></div>)}</section><div className="bulk-bar"><span>آخر تأكيد جماعي للتوفر منذ 3 أيام</span><button className="secondary-button">تأكيد توفر السيارات المحددة</button></div></div>; }

function Leads({ filter, setFilter }: { filter: string; setFilter: (filter: string) => void }) { const filters = ['كل الحالات', 'جديد', 'تم التواصل', 'موعد', 'غير معين']; const filtered = useMemo(() => filter === 'كل الحالات' ? leads : filter === 'غير معين' ? leads.filter((lead) => lead.assigned === 'غير معين') : leads.filter((lead) => lead.status === filter), [filter]); return <div className="page-stack"><div className="page-intro"><div><span className="section-kicker">إدارة العملاء</span><h2>العملاء المحتملون</h2><p>تابع رحلة العميل من أول اهتمام حتى إتمام البيع.</p></div><button className="primary-button">+ إضافة Lead</button></div><div className="lead-summary"><div><strong>12</strong><span>جديد هذا الأسبوع</span></div><div><strong>78%</strong><span>نسبة المتابعة</span></div><div><strong>4</strong><span>مواعيد قادمة</span></div><div><strong>2</strong><span>تم البيع</span></div></div><div className="toolbar"><div className="tabs">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="toolbar-search">⌕ <input placeholder="ابحث باسم العميل أو رقم الهاتف" aria-label="البحث في العملاء" /></div></div><section className="panel table-panel"><div className="table-head lead-head"><span>العميل</span><span>السيارة</span><span>الحالة</span><span>المسؤول</span><span>آخر تحديث</span><span /></div>{filtered.map((lead) => <div className="inventory-row lead-row" key={lead.id}><div className="lead-person"><span className="small-avatar">{lead.name[0]}</span><div><strong>{lead.name}</strong><small>{lead.phone} · {lead.id}</small></div></div><span className="lead-vehicle">{lead.vehicle}</span><span className={`badge ${statusTone[lead.status]}`}>{lead.status}</span><span className="assigned">{lead.assigned}</span><small className="updated-text">{lead.time}</small><button className="row-menu" aria-label={`فتح ${lead.name}`}>⋮</button></div>)}</section></div>; }

function Employees() { return <div className="page-stack"><div className="page-intro"><div><span className="section-kicker">فريق المعرض</span><h2>الموظفون</h2><p>أدر أعضاء فريقك وحدد أدوارهم وصلاحياتهم داخل المعرض.</p></div><button className="primary-button">+ دعوة موظف</button></div><section className="panel table-panel"><div className="table-head employee-head"><span>الموظف</span><span>الدور</span><span>الحالة</span><span>آخر دخول</span><span /></div>{[{ name: 'عبدالله السالم', role: 'مالك المعرض', status: 'نشط', last: 'الآن', avatar: 'ع' }, { name: 'سارة محمد', role: 'مديرة مبيعات', status: 'نشط', last: 'منذ ساعتين', avatar: 'س' }, { name: 'خالد صالح', role: 'موظف مبيعات', status: 'نشط', last: 'أمس', avatar: 'خ' }].map((employee) => <div className="inventory-row employee-row" key={employee.name}><div className="lead-person"><span className="small-avatar">{employee.avatar}</span><div><strong>{employee.name}</strong><small>عضو في معرض مسار النخبة</small></div></div><span className="assigned">{employee.role}</span><span className="badge positive">{employee.status}</span><small className="updated-text">{employee.last}</small><button className="row-menu" aria-label={`خيارات ${employee.name}`}>⋮</button></div>)}</section></div>; }

function Branch() { return <div className="page-stack"><div className="page-intro"><div><span className="section-kicker">معلومات المعرض</span><h2>الفرع الرئيسي</h2><p>إدارة بيانات الفرع الحالي، مع جاهزية لدعم فروع متعددة مستقبلاً.</p></div><button className="secondary-button">تعديل بيانات الفرع</button></div><section className="branch-layout"><div className="panel branch-hero"><span className="branch-symbol">⌖</span><h3>معرض مسار النخبة</h3><span className="badge positive">نشط ومعتمد</span><p>طريق الملك فهد، حي المروج<br />الرياض، المملكة العربية السعودية</p></div><div className="panel branch-details"><div><span>المدينة</span><strong>الرياض</strong></div><div><span>رقم التواصل</span><strong dir="ltr">+966 11 245 8800</strong></div><div><span>واتساب</span><strong dir="ltr">+966 55 123 4567</strong></div><div><span>ساعات العمل</span><strong>السبت – الخميس · ٩ ص – ١٠ م</strong></div></div></section></div>; }

function Settings() { return <div className="page-stack"><div className="page-intro"><div><span className="section-kicker">إدارة الحساب</span><h2>الإعدادات</h2><p>تحكم في تفضيلات المعرض والتنبيهات وحسابك.</p></div></div><section className="settings-grid"><div className="panel settings-card"><span className="settings-icon">◉</span><h3>بيانات المعرض</h3><p>الاسم، الشعار، معلومات التواصل والهوية العامة.</p><button className="text-button">فتح الإعدادات ←</button></div><div className="panel settings-card"><span className="settings-icon">◔</span><h3>التنبيهات</h3><p>اختر التنبيهات التي تريد استقبالها في لوحة التحكم.</p><button className="text-button">تعديل التفضيلات ←</button></div><div className="panel settings-card"><span className="settings-icon">◌</span><h3>الأمان والجلسات</h3><p>إدارة جلسات الدخول والأجهزة المرتبطة بحسابك.</p><button className="text-button">مراجعة الأمان ←</button></div></section></div>; }
