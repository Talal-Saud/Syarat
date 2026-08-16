export type Vehicle = {
  publicId: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  condition: 'جديدة' | 'مستعملة';
  price: number;
  mileage: number;
  city: string;
  dealer: string;
  dealerSlug: string;
  status: 'متاحة' | 'محجوزة';
  updated: string;
  transmission: string;
  fuel: string;
  body: string;
  image: string;
  accent: string;
  branch: string;
};

export type Dealer = {
  slug: string;
  name: string;
  city: string;
  branches: string[];
  phone: string;
  whatsapp: string;
  hours: string;
  description: string;
  logo: string;
};

const carImages = {
  camry: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=82',
  suv: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=82',
  sedan: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=82',
  luxury: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=82',
  blue: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1200&q=82',
  electric: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=82'
};

export const vehicles: Vehicle[] = [
  { publicId: 'camry-2025', name: 'تويوتا كامري GLE', brand: 'تويوتا', model: 'كامري', year: 2025, condition: 'جديدة', price: 138000, mileage: 0, city: 'الرياض', dealer: 'موتورز الرياض', dealerSlug: 'riyadh-motors', status: 'متاحة', updated: 'منذ ساعتين', transmission: 'أوتوماتيك', fuel: 'بنزين', body: 'سيدان', image: carImages.camry, accent: '#e6f1ed', branch: 'فرع طريق الملك خالد' },
  { publicId: 'landcruiser-2024', name: 'تويوتا لاندكروزر GXR', brand: 'تويوتا', model: 'لاندكروزر', year: 2024, condition: 'مستعملة', price: 289000, mileage: 18500, city: 'جدة', dealer: 'نخبة السيارات', dealerSlug: 'elite-cars', status: 'متاحة', updated: 'منذ 4 ساعات', transmission: 'أوتوماتيك', fuel: 'بنزين', body: 'SUV', image: carImages.suv, accent: '#f2e6dc', branch: 'فرع شارع الأمير سلطان' },
  { publicId: 'sonata-2023', name: 'هيونداي سوناتا Premium', brand: 'هيونداي', model: 'سوناتا', year: 2023, condition: 'مستعملة', price: 92000, mileage: 42000, city: 'الدمام', dealer: 'دار المركبة', dealerSlug: 'dar-almarkaba', status: 'متاحة', updated: 'أمس', transmission: 'أوتوماتيك', fuel: 'بنزين', body: 'سيدان', image: carImages.sedan, accent: '#e4edf5', branch: 'فرع طريق الخليج' },
  { publicId: 'porsche-2022', name: 'بورشه 911 Carrera', brand: 'بورشه', model: '911', year: 2022, condition: 'مستعملة', price: 465000, mileage: 12000, city: 'الرياض', dealer: 'بريميوم أوتو', dealerSlug: 'premium-auto', status: 'محجوزة', updated: 'منذ 6 ساعات', transmission: 'أوتوماتيك', fuel: 'بنزين', body: 'كوبيه', image: carImages.luxury, accent: '#f0e5df', branch: 'فرع حي الملقا' },
  { publicId: 'accord-2024', name: 'هوندا أكورد Sport', brand: 'هوندا', model: 'أكورد', year: 2024, condition: 'مستعملة', price: 119000, mileage: 27000, city: 'مكة', dealer: 'موتورز الرياض', dealerSlug: 'riyadh-motors', status: 'متاحة', updated: 'منذ يومين', transmission: 'أوتوماتيك', fuel: 'بنزين', body: 'سيدان', image: carImages.blue, accent: '#e3edf2', branch: 'فرع العزيزية' },
  { publicId: 'model-3-2024', name: 'تسلا Model 3 Long Range', brand: 'تسلا', model: 'Model 3', year: 2024, condition: 'جديدة', price: 189000, mileage: 0, city: 'الخبر', dealer: 'إيليت أوتو', dealerSlug: 'elite-cars', status: 'متاحة', updated: 'منذ 3 أيام', transmission: 'أوتوماتيك', fuel: 'كهرباء', body: 'سيدان', image: carImages.electric, accent: '#e7e8f3', branch: 'فرع الكورنيش' }
];

export const dealers: Dealer[] = [
  { slug: 'riyadh-motors', name: 'موتورز الرياض', city: 'الرياض', branches: ['طريق الملك خالد', 'العزيزية'], phone: '011 445 8822', whatsapp: '966554458822', hours: 'السبت–الخميس، 9 ص–11 م', description: 'اختيارات موثوقة من السيارات الجديدة والمستعملة مع فحص شامل وتمويل مرن.', logo: 'م ر' },
  { slug: 'elite-cars', name: 'نخبة السيارات', city: 'جدة', branches: ['شارع الأمير سلطان', 'التحلية'], phone: '012 600 1830', whatsapp: '966506001830', hours: 'يومياً، 10 ص–10 م', description: 'تجربة شراء هادئة وشفافة للسيارات العائلية والفاخرة.', logo: 'نخ' },
  { slug: 'dar-almarkaba', name: 'دار المركبة', city: 'الدمام', branches: ['طريق الخليج'], phone: '013 822 4050', whatsapp: '966538224050', hours: 'السبت–الخميس، 8 ص–10 م', description: 'معرض محلي بخبرة طويلة وخدمة ما بعد البيع.', logo: 'د م' },
  { slug: 'premium-auto', name: 'بريميوم أوتو', city: 'الرياض', branches: ['حي الملقا'], phone: '011 420 7811', whatsapp: '966554207811', hours: 'يومياً، 10 ص–12 م', description: 'سيارات مختارة بعناية لعشاق القيادة المميزة.', logo: 'ب أ' }
];

export const brandNames = ['تويوتا', 'هيونداي', 'مرسيدس', 'هوندا', 'نيسان', 'لكزس', 'تسلا'];
export const cities = ['الرياض', 'جدة', 'الدمام', 'مكة', 'الخبر', 'المدينة المنورة', 'أبها'];

export function getVehicle(publicId: string) {
  return vehicles.find((vehicle) => vehicle.publicId === publicId) ?? vehicles[0];
}

export function getDealer(slug: string) {
  return dealers.find((dealer) => dealer.slug === slug) ?? dealers[0];
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('ar-SA').format(price);
}

export function formatMileage(mileage: number) {
  return mileage === 0 ? 'جديدة' : `${new Intl.NumberFormat('ar-SA').format(mileage)} كم`;
}
