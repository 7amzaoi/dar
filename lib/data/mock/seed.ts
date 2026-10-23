import type {
  Category,
  Collection,
  Company,
  Conversation,
  Favorite,
  Message,
  Notification,
  Order,
  OrderHistoryEntry,
  OrderStatus,
  Product,
  StockStatus,
  User,
} from "../types";

/** Seed timestamps are relative to this anchor so the demo always looks recent. */
const NOW = Date.now();
const daysAgo = (d: number, h = 0) => new Date(NOW - d * 86_400_000 - h * 3_600_000).toISOString();

/* ------------------------------------------------------------------ */
/* Companies                                                           */
/* ------------------------------------------------------------------ */

export const companies: Company[] = [
  {
    id: "m1",
    type: "manufacturer",
    name: "Damietta Atelier",
    country: "EG",
    city: "Damietta",
    phone: "+20 57 222 4810",
    verified: true,
    about:
      "ورشة عائلية في دمياط منذ عام 1962، متخصصة في الأخشاب الصلبة المنحوتة يدوياً وغرف النوم والسفرة الكلاسيكية المعاصرة. نعمل مع صالات العرض في الخليج والمشرق بطلبيات مخصصة وتشطيبات حسب الطلب.",
    aboutEn:
      "A family workshop in Damietta since 1962, specialising in hand-carved solid wood, bedroom and dining pieces with a contemporary classical eye. We supply showrooms across the Gulf and Levant with bespoke finishes.",
  },
  {
    id: "m2",
    type: "manufacturer",
    name: "İnegöl Modern",
    country: "TR",
    city: "İnegöl",
    phone: "+90 224 715 3300",
    verified: true,
    about:
      "مصنع تنجيد حديث في إينجول، قلب صناعة الأثاث التركية. نتميز بالكنب المعياري وأقمشة البوكليه والكتان وبأوقات تسليم سريعة للطلبيات بالجملة.",
    aboutEn:
      "A modern upholstery manufacturer in İnegöl, the heart of Turkish furniture making. Known for modular sofas, bouclé and linen upholstery and fast wholesale lead times.",
  },
  {
    id: "m3",
    type: "manufacturer",
    name: "Casa Brianza",
    country: "IT",
    city: "Meda",
    phone: "+39 0362 330 912",
    verified: true,
    about:
      "دار تصميم إيطالية من منطقة بريانزا، تجمع بين الحرفية التقليدية والتصميم المعاصر. قطع محدودة الإنتاج من الجلد والمخمل والحجر الطبيعي.",
    aboutEn:
      "An Italian design house from Brianza pairing traditional craft with contemporary design. Limited-run pieces in leather, velvet and natural stone.",
  },
  {
    id: "m4",
    type: "manufacturer",
    name: "Jepara Teak Works",
    country: "ID",
    city: "Jepara",
    phone: "+62 291 598 220",
    verified: true,
    about:
      "خشب ساج معتمد من مزارع مستدامة في جاوة الوسطى. طاولات سفرة وأثاث خارجي وقطع روطان منسوجة يدوياً.",
    aboutEn:
      "Certified plantation teak from Central Java. Dining tables, outdoor-ready pieces and hand-woven rattan.",
  },
  {
    id: "m5",
    type: "manufacturer",
    name: "Najd Woodcraft",
    country: "SA",
    city: "Riyadh",
    phone: "+966 11 482 9930",
    verified: true,
    about:
      "مصنع سعودي للأثاث المكتبي والتنفيذي، بتصاميم تستلهم العمارة النجدية. خدمة تصنيع محلية وتسليم سريع داخل المملكة.",
    aboutEn:
      "A Saudi maker of executive and office furniture inspired by Najdi architecture, with local production and fast delivery within the Kingdom.",
  },
  {
    id: "m6",
    type: "manufacturer",
    name: "Al Waha Lighting",
    country: "AE",
    city: "Dubai",
    phone: "+971 4 339 1208",
    verified: true,
    about:
      "استوديو للإضاءة والمرايا والإكسسوارات في دبي، بتشطيبات نحاسية مصقولة وخزف مصنوع يدوياً.",
    aboutEn:
      "A Dubai studio for lighting, mirrors and decorative objects, with brushed-brass finishes and handmade ceramics.",
  },
  {
    id: "m7",
    type: "manufacturer",
    name: "Marrakech Loom House",
    country: "MA",
    city: "Marrakech",
    phone: "+212 524 388 104",
    verified: false,
    about: "نسّاجون تقليديون للسجاد والمنسوجات والوسائد من المدينة الحمراء.",
    aboutEn: "Traditional weavers of rugs, textiles and cushions from the Red City.",
  },
  {
    id: "m8",
    type: "manufacturer",
    name: "Lisboa Linen Co.",
    country: "PT",
    city: "Guimarães",
    phone: "+351 253 410 776",
    verified: false,
    about: "منسوجات كتان برتغالية لغرف النوم والضيافة.",
    aboutEn: "Portuguese linen textiles for bedroom and hospitality projects.",
  },
  {
    id: "r1",
    type: "retailer",
    name: "Bayt Showroom",
    country: "SA",
    city: "Riyadh",
    phone: "+966 11 205 7741",
    verified: true,
    about: "صالة عرض أثاث فاخر في حي الملقا بالرياض، مع فرع ثانٍ في جدة.",
    aboutEn: "A luxury furniture showroom in Al Malqa, Riyadh, with a second branch in Jeddah.",
  },
  {
    id: "r2",
    type: "retailer",
    name: "Maison Khaleej",
    country: "AE",
    city: "Dubai",
    phone: "+971 4 557 2210",
    verified: true,
    about: "متجر مفاهيمي للتصميم الداخلي في حي دبي للتصميم.",
    aboutEn: "A concept interiors store in Dubai Design District.",
  },
  {
    id: "r3",
    type: "retailer",
    name: "Dar Al Athath",
    country: "KW",
    city: "Kuwait City",
    phone: "+965 2240 1180",
    verified: true,
    about: "من أعرق معارض الأثاث في الكويت، يخدم المنازل والمشاريع الفندقية.",
    aboutEn: "One of Kuwait's longest-standing furniture houses, serving homes and hospitality projects.",
  },
  {
    id: "r4",
    type: "retailer",
    name: "Zaha Interiors",
    country: "JO",
    city: "Amman",
    phone: "+962 6 592 0034",
    verified: true,
    about: "استوديو تصميم داخلي وصالة عرض في عبدون، عمّان.",
    aboutEn: "An interior design studio and showroom in Abdoun, Amman.",
  },
  {
    id: "r5",
    type: "retailer",
    name: "Nile Home Gallery",
    country: "EG",
    city: "Cairo",
    phone: "+20 2 2736 5590",
    verified: false,
    about: "صالة عرض جديدة في التجمع الخامس بالقاهرة الجديدة.",
    aboutEn: "A new showroom in the Fifth Settlement, New Cairo.",
  },
];

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export const users: User[] = [
  { id: "u-admin", role: "admin", email: "admin@dar.trade", name: "Layla Haddad", status: "approved", companyId: "", createdAt: daysAgo(400) },
  { id: "u-m1", role: "manufacturer", email: "omar@damietta-atelier.com", name: "Omar El-Sayed", status: "approved", companyId: "m1", createdAt: daysAgo(320) },
  { id: "u-m2", role: "manufacturer", email: "emre@inegolmodern.com", name: "Emre Yılmaz", status: "approved", companyId: "m2", createdAt: daysAgo(300) },
  { id: "u-m3", role: "manufacturer", email: "giulia@casabrianza.it", name: "Giulia Conti", status: "approved", companyId: "m3", createdAt: daysAgo(280) },
  { id: "u-m4", role: "manufacturer", email: "sari@jeparateak.co.id", name: "Sari Wibowo", status: "approved", companyId: "m4", createdAt: daysAgo(260) },
  { id: "u-m5", role: "manufacturer", email: "faisal@najdwoodcraft.sa", name: "Faisal Al-Qahtani", status: "approved", companyId: "m5", createdAt: daysAgo(210) },
  { id: "u-m6", role: "manufacturer", email: "rania@alwaha.ae", name: "Rania Mansour", status: "approved", companyId: "m6", createdAt: daysAgo(190) },
  { id: "u-m7", role: "manufacturer", email: "youssef@loomhouse.ma", name: "Youssef Benali", status: "pending", companyId: "m7", createdAt: daysAgo(2) },
  { id: "u-m8", role: "manufacturer", email: "ines@lisboalinen.pt", name: "Inês Duarte", status: "pending", companyId: "m8", createdAt: daysAgo(4) },
  { id: "u-r1", role: "retailer", email: "abdullah@bayt.sa", name: "Abdullah Al-Rashid", status: "approved", companyId: "r1", createdAt: daysAgo(240) },
  { id: "u-r2", role: "retailer", email: "mariam@maisonkhaleej.ae", name: "Mariam Al-Falasi", status: "approved", companyId: "r2", createdAt: daysAgo(230) },
  { id: "u-r3", role: "retailer", email: "khaled@daralathath.kw", name: "Khaled Al-Mutairi", status: "approved", companyId: "r3", createdAt: daysAgo(150) },
  { id: "u-r4", role: "retailer", email: "dana@zahainteriors.jo", name: "Dana Khoury", status: "approved", companyId: "r4", createdAt: daysAgo(120) },
  { id: "u-r5", role: "retailer", email: "hana@nilehome.eg", name: "Hana Fawzy", status: "pending", companyId: "r5", createdAt: daysAgo(1) },
  { id: "u-r6", role: "retailer", email: "tariq@maisonkhaleej.ae", name: "Tariq Nasser", status: "suspended", companyId: "r2", createdAt: daysAgo(90) },
];

/** The accounts the dev role switcher / demo login use. */
export const DEMO_USER_BY_ROLE = { manufacturer: "u-m1", retailer: "u-r1", admin: "u-admin" } as const;

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const categories: Category[] = [
  { id: "c-sofas", nameAr: "أرائك وجلسات", nameEn: "Sofas & Seating" },
  { id: "c-sofas-sofas", nameAr: "أرائك", nameEn: "Sofas", parentId: "c-sofas" },
  { id: "c-sofas-sectionals", nameAr: "كنب زاوية", nameEn: "Sectionals", parentId: "c-sofas" },
  { id: "c-sofas-armchairs", nameAr: "كراسي استرخاء", nameEn: "Armchairs", parentId: "c-sofas" },
  { id: "c-bedroom", nameAr: "غرف نوم", nameEn: "Bedroom" },
  { id: "c-bed-beds", nameAr: "أسرّة", nameEn: "Beds", parentId: "c-bedroom" },
  { id: "c-bed-storage", nameAr: "خزائن وكومودينو", nameEn: "Wardrobes & Nightstands", parentId: "c-bedroom" },
  { id: "c-dining", nameAr: "سفرة", nameEn: "Dining" },
  { id: "c-dining-tables", nameAr: "طاولات سفرة", nameEn: "Dining Tables", parentId: "c-dining" },
  { id: "c-dining-chairs", nameAr: "كراسي سفرة", nameEn: "Dining Chairs", parentId: "c-dining" },
  { id: "c-dining-storage", nameAr: "بوفيهات", nameEn: "Sideboards", parentId: "c-dining" },
  { id: "c-office", nameAr: "مكاتب", nameEn: "Office" },
  { id: "c-office-desks", nameAr: "طاولات مكتب", nameEn: "Desks", parentId: "c-office" },
  { id: "c-office-seating", nameAr: "كراسي مكتب", nameEn: "Office Chairs", parentId: "c-office" },
  { id: "c-office-storage", nameAr: "مكتبات", nameEn: "Bookcases", parentId: "c-office" },
  { id: "c-decor", nameAr: "إكسسوارات", nameEn: "Decor" },
  { id: "c-decor-lighting", nameAr: "إضاءة", nameEn: "Lighting", parentId: "c-decor" },
  { id: "c-decor-mirrors", nameAr: "مرايا", nameEn: "Mirrors", parentId: "c-decor" },
  { id: "c-decor-objects", nameAr: "مزهريات وتحف", nameEn: "Vases & Objects", parentId: "c-decor" },
];

/** Cover image used for each top-level category tile. */
export const CATEGORY_COVERS: Record<string, string> = {
  "c-sofas": "/images/products/sofa-ivory-a.svg",
  "c-bedroom": "/images/products/bed-stone-a.svg",
  "c-dining": "/images/products/dining-table-espresso-a.svg",
  "c-office": "/images/products/desk-sage-a.svg",
  "c-decor": "/images/products/lamp-terracotta-a.svg",
};

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export const collections: Collection[] = [
  { id: "col-sahel", manufacturerId: "m2", nameAr: "الساحل", nameEn: "Sahel", coverUrl: "/images/scenes/collection-sahel.svg" },
  { id: "col-dune", manufacturerId: "m2", nameAr: "الكثبان", nameEn: "Dune", coverUrl: "/images/scenes/collection-dune.svg" },
  { id: "col-nocturne", manufacturerId: "m3", nameAr: "نوكتورن", nameEn: "Nocturne", coverUrl: "/images/scenes/collection-nocturne.svg" },
  { id: "col-atrium", manufacturerId: "m3", nameAr: "الأتريوم", nameEn: "Atrium", coverUrl: "/images/scenes/collection-atrium.svg" },
  { id: "col-andalus", manufacturerId: "m6", nameAr: "الأندلس", nameEn: "Andalus", coverUrl: "/images/scenes/collection-andalus.svg" },
  { id: "col-olive", manufacturerId: "m4", nameAr: "بستان الزيتون", nameEn: "Olive Grove", coverUrl: "/images/scenes/collection-olive.svg" },
  { id: "col-studio", manufacturerId: "m5", nameAr: "ستوديو", nameEn: "Studio", coverUrl: "/images/scenes/collection-studio.svg" },
  { id: "col-cedar", manufacturerId: "m1", nameAr: "الأرز", nameEn: "Cedar", coverUrl: "/images/scenes/collection-cedar.svg" },
];

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

const MATERIAL_NAMES: Record<string, [ar: string, en: string]> = {
  boucle: ["قماش البوكليه", "bouclé"],
  velvet: ["المخمل", "velvet"],
  linen: ["الكتان", "linen"],
  leather: ["الجلد الطبيعي", "full-grain leather"],
  wool: ["الصوف", "wool"],
  walnut: ["خشب الجوز", "walnut"],
  oak: ["خشب البلوط", "oak"],
  teak: ["خشب الساج", "teak"],
  beech: ["خشب الزان", "beech"],
  ash: ["خشب الدردار", "ash"],
  marble: ["الرخام", "marble"],
  travertine: ["الترافرتين", "travertine"],
  brass: ["النحاس المصقول", "brushed brass"],
  steel: ["الفولاذ", "steel"],
  rattan: ["الروطان", "rattan"],
  ceramic: ["الخزف", "ceramic"],
  glass: ["الزجاج", "glass"],
};

type TopCategory = "sofas" | "bedroom" | "dining" | "office" | "decor";
const DESCRIPTIONS: Record<TopCategory, [ar: string, en: string]> = {
  sofas: [
    "تجمع {title} بين هيكل من الخشب الصلب المجفف بالفرن وإسفنج عالي المرونة ووسائد ملفوفة بالريش، مع تنجيد من {material}. صُممت لتدوم في صالات العرض وفي الاستخدام اليومي، وتتوفر بتشطيبات وأقمشة حسب الطلب للطلبيات الكبيرة.",
    "{title} pairs a kiln-dried hardwood frame with high-resilience foam and feather-wrapped cushions, upholstered in {material}. Built to last on the showroom floor and in daily use, with custom fabrics available on larger orders.",
  ],
  bedroom: [
    "{title} قطعة هادئة لغرفة النوم، مصنوعة من {material} بوصلات تقليدية وتشطيب زيتي يدوي يُبرز عروق الخشب. تُشحن مفككة جزئياً لتسهيل التخزين والتركيب في صالات العرض.",
    "{title} is a calm bedroom piece crafted in {material}, with traditional joinery and a hand-rubbed oil finish that brings out the grain. Ships partially knocked-down for easier storage and showroom assembly.",
  ],
  dining: [
    "صُممت {title} لتكون محور غرفة الطعام، من {material} مختار بعناية، مع حواف مشطوفة ناعمة وتشطيب مقاوم للبقع مناسب للاستخدام اليومي والضيافة.",
    "{title} is designed as the centrepiece of the dining room, in carefully selected {material}, with softly chamfered edges and a stain-resistant finish suited to daily use and hospitality.",
  ],
  office: [
    "{title} تجمع بين الوظيفة والحضور، من {material} مع تفاصيل مدروسة لإدارة الكابلات والتخزين. مثالية للمكاتب التنفيذية والمكاتب المنزلية الراقية.",
    "{title} balances function and presence, in {material} with considered cable management and storage details. Ideal for executive suites and refined home offices.",
  ],
  decor: [
    "{title} لمسة نهائية مصنوعة يدوياً من {material}، تضيف دفئاً وطبقة من الضوء والملمس إلى أي مساحة. كل قطعة فريدة بتفاوت طفيف يعكس الصنعة اليدوية.",
    "{title} is a handmade finishing touch in {material}, adding warmth, light and texture to any space. Each piece is unique, with slight variations that reflect the handwork.",
  ],
};

const CATEGORY_TOP: Record<string, TopCategory> = {
  "c-sofas-sofas": "sofas",
  "c-sofas-sectionals": "sofas",
  "c-sofas-armchairs": "sofas",
  "c-bed-beds": "bedroom",
  "c-bed-storage": "bedroom",
  "c-dining-tables": "dining",
  "c-dining-chairs": "dining",
  "c-dining-storage": "dining",
  "c-office-desks": "office",
  "c-office-seating": "office",
  "c-office-storage": "office",
  "c-decor-lighting": "decor",
  "c-decor-mirrors": "decor",
  "c-decor-objects": "decor",
};

type Row = [
  id: string,
  manufacturerId: string,
  categoryId: string,
  imageKind: string,
  tone: string,
  titleEn: string,
  titleAr: string,
  materials: string[],
  colors: string[],
  dims: [number, number, number],
  basePrice: number,
  moq: number,
  stock: StockStatus,
  leadDays: number,
  collectionId: string | null,
  createdDaysAgo: number,
  published?: boolean,
];

const rows: Row[] = [
  ["p1", "m2", "c-sofas-sofas", "sofa", "ivory", "Sahel Three-Seater", "كنبة الساحل الثلاثية", ["boucle", "oak"], ["ivory"], [240, 82, 98], 980, 4, "in_stock", 21, "col-sahel", 12],
  ["p2", "m2", "c-sofas-sofas", "sofa", "terracotta", "Dune Curved Sofa", "كنبة الكثبان المنحنية", ["velvet", "beech"], ["terracotta"], [260, 78, 100], 1240, 4, "made_to_order", 35, "col-dune", 30],
  ["p3", "m3", "c-sofas-sofas", "sofa", "ink", "Nocturne Lounge Sofa", "كنبة نوكتورن", ["velvet", "brass"], ["ink"], [230, 76, 96], 2150, 2, "made_to_order", 45, "col-nocturne", 8],
  ["p4", "m2", "c-sofas-sofas", "sofa", "sage", "Oasis Two-Seater", "كنبة الواحة الثنائية", ["linen", "oak"], ["olive"], [180, 84, 92], 760, 6, "in_stock", 14, null, 50],
  ["p5", "m3", "c-sofas-sofas", "sofa", "espresso", "Brera Leather Sofa", "كنبة بريرا الجلدية", ["leather", "walnut"], ["cognac"], [220, 80, 95], 2480, 2, "made_to_order", 50, "col-atrium", 70],
  ["p6", "m1", "c-sofas-sofas", "sofa", "stone", "Corniche Sofa", "كنبة الكورنيش", ["linen", "beech"], ["stone"], [210, 85, 95], 690, 6, "in_stock", 18, null, 40],
  ["p7", "m2", "c-sofas-sectionals", "sectional", "ivory", "Sahel Modular Sectional", "كنبة زاوية الساحل", ["boucle", "oak"], ["sand"], [320, 82, 180], 2280, 2, "made_to_order", 30, "col-sahel", 20],
  ["p8", "m3", "c-sofas-sectionals", "sectional", "ink", "Nocturne Corner Sectional", "زاوية نوكتورن", ["velvet", "steel"], ["ink"], [340, 76, 200], 3900, 1, "made_to_order", 55, "col-nocturne", 15],
  ["p9", "m2", "c-sofas-sectionals", "sectional", "stone", "Dune Chaise Sectional", "زاوية الكثبان مع شيزلونج", ["wool", "beech"], ["stone"], [300, 80, 170], 1980, 2, "in_stock", 20, "col-dune", 45],
  ["p10", "m3", "c-sofas-armchairs", "armchair", "terracotta", "Atrium Lounge Chair", "كرسي الأتريوم", ["boucle", "walnut"], ["terracotta"], [82, 78, 84], 890, 4, "in_stock", 21, "col-atrium", 6],
  ["p11", "m2", "c-sofas-armchairs", "armchair", "ivory", "Sahel Shell Armchair", "كرسي الساحل الصدفي", ["boucle", "oak"], ["ivory"], [78, 74, 80], 540, 6, "in_stock", 14, "col-sahel", 11],
  ["p12", "m4", "c-sofas-armchairs", "armchair", "sage", "Veranda Rattan Chair", "كرسي الشرفة من الروطان", ["rattan", "teak"], ["natural"], [70, 80, 76], 380, 8, "in_stock", 25, null, 33],
  ["p13", "m3", "c-sofas-armchairs", "armchair", "espresso", "Brera Club Chair", "كرسي بريرا", ["leather", "walnut"], ["cognac"], [86, 76, 90], 1350, 2, "made_to_order", 40, "col-atrium", 64],
  ["p14", "m1", "c-bed-beds", "bed", "stone", "Cedar Channel Bed", "سرير الأرز", ["linen", "beech"], ["stone"], [180, 120, 210], 1150, 3, "made_to_order", 30, "col-cedar", 26],
  ["p15", "m1", "c-bed-beds", "bed", "espresso", "Cedar Carved King Bed", "سرير الأرز المنحوت", ["walnut", "velvet"], ["walnut"], [200, 140, 220], 1680, 2, "made_to_order", 40, "col-cedar", 19],
  ["p16", "m2", "c-bed-beds", "bed", "ivory", "Sahel Upholstered Bed", "سرير الساحل المنجّد", ["boucle", "oak"], ["ivory"], [180, 110, 215], 920, 4, "in_stock", 18, "col-sahel", 9],
  ["p17", "m3", "c-bed-beds", "bed", "ink", "Nocturne Bed", "سرير نوكتورن", ["velvet", "brass"], ["ink"], [200, 125, 225], 2650, 1, "made_to_order", 50, "col-nocturne", 3],
  ["p18", "m4", "c-bed-beds", "bed", "sage", "Olive Grove Teak Bed", "سرير بستان الزيتون", ["teak", "linen"], ["natural"], [180, 100, 210], 980, 3, "in_stock", 28, "col-olive", 37],
  ["p19", "m1", "c-bed-storage", "wardrobe", "ivory", "Cedar Fluted Wardrobe", "خزانة الأرز المضلّعة", ["oak", "brass"], ["natural"], [160, 220, 60], 1450, 2, "made_to_order", 35, "col-cedar", 22],
  ["p20", "m1", "c-bed-storage", "nightstand", "espresso", "Cedar Nightstand", "كومودينو الأرز", ["walnut", "brass"], ["walnut"], [55, 55, 42], 340, 6, "in_stock", 14, "col-cedar", 22],
  ["p21", "m4", "c-bed-storage", "nightstand", "sage", "Olive Grove Bedside Table", "طاولة جانبية بستان الزيتون", ["teak"], ["natural"], [50, 52, 40], 210, 10, "in_stock", 21, "col-olive", 48],
  ["p22", "m5", "c-bed-storage", "wardrobe", "espresso", "Najd Walnut Armoire", "خزانة نجد من الجوز", ["walnut", "brass"], ["walnut"], [180, 230, 62], 2100, 1, "made_to_order", 45, null, 1, false],
  ["p23", "m4", "c-dining-tables", "dining-table", "sage", "Olive Grove Dining Table", "طاولة سفرة بستان الزيتون", ["teak"], ["natural"], [240, 76, 100], 1320, 2, "in_stock", 30, "col-olive", 14],
  ["p24", "m1", "c-dining-tables", "dining-table", "espresso", "Damietta Banquet Table", "طاولة الولائم الدمياطية", ["walnut", "marble"], ["walnut"], [280, 76, 110], 2400, 1, "made_to_order", 40, null, 28],
  ["p25", "m3", "c-dining-tables", "dining-table", "stone", "Atrium Travertine Table", "طاولة الأتريوم من الترافرتين", ["travertine", "steel"], ["stone"], [220, 75, 100], 3200, 1, "made_to_order", 60, "col-atrium", 5],
  ["p26", "m4", "c-dining-tables", "dining-table", "terracotta", "Jepara Round Table", "طاولة جيبارا الدائرية", ["teak"], ["natural"], [140, 76, 140], 860, 3, "in_stock", 25, null, 55],
  ["p27", "m4", "c-dining-chairs", "dining-chair", "sage", "Olive Grove Dining Chair", "كرسي سفرة بستان الزيتون", ["teak", "linen"], ["olive"], [50, 88, 56], 190, 12, "in_stock", 21, "col-olive", 14],
  ["p28", "m1", "c-dining-chairs", "dining-chair", "terracotta", "Damietta Carved Chair", "كرسي دمياطي منحوت", ["beech", "velvet"], ["terracotta"], [52, 100, 58], 260, 12, "in_stock", 18, null, 28],
  ["p29", "m3", "c-dining-chairs", "dining-chair", "ivory", "Atrium Bouclé Chair", "كرسي الأتريوم بوكليه", ["boucle", "walnut"], ["ivory"], [54, 82, 58], 420, 8, "made_to_order", 35, "col-atrium", 5],
  ["p30", "m2", "c-dining-chairs", "dining-chair", "stone", "Dune Dining Chair", "كرسي سفرة الكثبان", ["linen", "oak"], ["sand"], [50, 84, 55], 175, 12, "out_of_stock", 28, "col-dune", 44],
  ["p31", "m3", "c-dining-storage", "sideboard", "espresso", "Nocturne Fluted Sideboard", "بوفيه نوكتورن المضلّع", ["walnut", "brass"], ["walnut"], [200, 78, 48], 1880, 2, "made_to_order", 40, "col-nocturne", 16],
  ["p32", "m4", "c-dining-storage", "sideboard", "ivory", "Jepara Teak Credenza", "كريدنزا جيبارا", ["teak", "rattan"], ["natural"], [180, 80, 45], 940, 3, "in_stock", 25, "col-olive", 38],
  ["p33", "m1", "c-dining-storage", "sideboard", "stone", "Damietta Marble Buffet", "بوفيه دمياطي رخامي", ["oak", "marble"], ["stone"], [190, 85, 50], 1290, 2, "in_stock", 21, null, 31],
  ["p34", "m5", "c-office-desks", "desk", "stone", "Studio Executive Desk", "مكتب ستوديو التنفيذي", ["oak", "steel"], ["natural"], [180, 75, 85], 1180, 2, "made_to_order", 30, "col-studio", 24],
  ["p35", "m5", "c-office-desks", "desk", "espresso", "Najd Walnut Writing Desk", "مكتب الكتابة نجد", ["walnut", "leather"], ["walnut"], [140, 76, 70], 980, 3, "in_stock", 20, "col-studio", 17],
  ["p36", "m3", "c-office-desks", "desk", "ivory", "Atrium Console Desk", "مكتب كونسول الأتريوم", ["ash", "brass"], ["ivory"], [120, 76, 55], 860, 3, "made_to_order", 35, null, 42],
  ["p37", "m5", "c-office-seating", "office-chair", "espresso", "Studio Task Chair", "كرسي مكتب ستوديو", ["leather", "steel"], ["cognac"], [65, 110, 65], 520, 6, "in_stock", 14, "col-studio", 24],
  ["p38", "m5", "c-office-seating", "office-chair", "ink", "Studio Conference Chair", "كرسي اجتماعات ستوديو", ["wool", "steel"], ["charcoal"], [62, 95, 62], 360, 10, "in_stock", 14, "col-studio", 24],
  ["p39", "m5", "c-office-storage", "bookshelf", "ivory", "Studio Library Shelf", "مكتبة ستوديو", ["oak"], ["natural"], [120, 200, 40], 760, 3, "in_stock", 21, "col-studio", 36],
  ["p40", "m1", "c-office-storage", "bookshelf", "espresso", "Damietta Arched Bookcase", "مكتبة دمياطية مقوّسة", ["walnut"], ["walnut"], [110, 210, 42], 940, 2, "made_to_order", 30, null, 52],
  ["p41", "m6", "c-decor-lighting", "lamp", "ivory", "Andalus Pleated Floor Lamp", "مصباح الأندلس الأرضي", ["linen", "brass"], ["ivory"], [50, 165, 50], 290, 10, "in_stock", 14, "col-andalus", 10],
  ["p42", "m6", "c-decor-lighting", "lamp", "espresso", "Lantern Brass Floor Lamp", "مصباح الفانوس النحاسي", ["brass", "linen"], ["brass"], [45, 170, 45], 360, 8, "in_stock", 14, null, 20],
  ["p43", "m6", "c-decor-lighting", "lamp", "sage", "Oasis Ceramic Lamp", "مصباح الواحة الخزفي", ["ceramic", "linen"], ["olive"], [35, 60, 35], 140, 20, "in_stock", 10, null, 27],
  ["p44", "m6", "c-decor-mirrors", "mirror", "ivory", "Andalus Arched Mirror", "مرآة الأندلس المقوّسة", ["brass", "glass"], ["brass"], [90, 180, 4], 420, 6, "in_stock", 14, "col-andalus", 10],
  ["p45", "m6", "c-decor-mirrors", "mirror", "terracotta", "Mashrabiya Mirror", "مرآة المشربية", ["oak", "glass"], ["natural"], [80, 160, 5], 380, 6, "made_to_order", 25, null, 46],
  ["p46", "m6", "c-decor-mirrors", "mirror", "stone", "Halo Round Mirror", "مرآة الهالة الدائرية", ["brass", "glass"], ["brass"], [100, 100, 4], 260, 8, "out_of_stock", 30, null, 58],
  ["p47", "m6", "c-decor-objects", "vase", "stone", "Andalus Ceramic Vessel Set", "طقم أواني الأندلس الخزفية", ["ceramic"], ["stone"], [30, 45, 30], 120, 24, "in_stock", 10, "col-andalus", 10],
  ["p48", "m4", "c-decor-objects", "vase", "terracotta", "Jepara Terracotta Urns", "جرار جيبارا الفخارية", ["ceramic"], ["terracotta"], [40, 60, 40], 95, 24, "in_stock", 18, null, 61],
  ["p49", "m6", "c-decor-objects", "vase", "espresso", "Sculpted Brass Vase", "مزهرية نحاسية منحوتة", ["brass"], ["brass"], [22, 50, 22], 160, 12, "made_to_order", 20, null, 2, false],
];

function tiers(base: number, moq: number) {
  const round = (n: number) => Math.round(n / 5) * 5;
  return [
    { minQty: moq, unitPrice: base, currency: "USD" },
    { minQty: moq * 3, unitPrice: round(base * 0.93), currency: "USD" },
    { minQty: moq * 8, unitPrice: round(base * 0.86), currency: "USD" },
  ];
}

export const products: Product[] = rows.map(
  ([id, manufacturerId, categoryId, kind, tone, titleEn, titleAr, materials, colors, [w, h, d], base, moq, stock, lead, collectionId, created, published = true]) => {
    const [descAr, descEn] = DESCRIPTIONS[CATEGORY_TOP[categoryId]];
    const [matAr, matEn] = MATERIAL_NAMES[materials[0]];
    return {
      id,
      manufacturerId,
      titleAr,
      titleEn,
      descriptionAr: descAr.replace("{title}", titleAr).replace("{material}", matAr),
      descriptionEn: descEn.replace("{title}", titleEn).replace("{material}", matEn),
      categoryId,
      images: ["a", "b", "c"].map((v) => `/images/products/${kind}-${tone}-${v}.svg`),
      materials,
      colors,
      dimensions: { width: w, height: h, depth: d, unit: "cm" },
      priceTiers: tiers(base, moq),
      minOrderQty: moq,
      stockStatus: stock,
      leadTimeDays: lead,
      collectionId: collectionId ?? undefined,
      published,
      createdAt: daysAgo(created, id.length),
    };
  },
);

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

const PIPELINE: OrderStatus[] = ["quote_requested", "quoted", "confirmed", "in_production", "shipped", "completed"];

function history(status: OrderStatus, isRFQ: boolean, created: number): OrderHistoryEntry[] {
  if (status === "cancelled") {
    return [
      { status: "quote_requested", at: daysAgo(created) },
      { status: "cancelled", at: daysAgo(created - 3) },
    ];
  }
  const path = isRFQ ? PIPELINE : PIPELINE.slice(2);
  const upto = path.indexOf(status);
  const step = upto > 0 ? Math.max(1, Math.floor(created / (upto + 1))) : 0;
  return path.slice(0, upto + 1).map((s, i) => ({ status: s, at: daysAgo(created - i * step) }));
}

type OrderRow = [id: string, retailerId: string, manufacturerId: string, status: OrderStatus, isRFQ: boolean, created: number, items: [string, number, number?][], note?: string];

const orderRows: OrderRow[] = [
  ["o-1001", "r1", "m2", "quote_requested", true, 1, [["p1", 8], ["p11", 12]], "نفتتح فرعاً جديداً في الرياض ونحتاج التسليم قبل منتصف ديسمبر. هل يمكن توفير قماش البوكليه بلون أفتح؟"],
  ["o-1002", "r2", "m3", "quoted", true, 5, [["p3", 2, 2050], ["p10", 4, 860]], "For our D3 window display — please confirm velvet colourways available."],
  ["o-1003", "r1", "m4", "confirmed", false, 9, [["p23", 2, 1320], ["p27", 12, 190]]],
  ["o-1004", "r3", "m1", "in_production", true, 18, [["p14", 4, 1080], ["p20", 8, 320]], "مشروع فندقي — نرجو توحيد درجة الخشب في جميع القطع."],
  ["o-1005", "r4", "m6", "shipped", false, 26, [["p41", 10, 280], ["p44", 6, 410]]],
  ["o-1006", "r2", "m5", "completed", false, 45, [["p37", 12, 480], ["p34", 2, 1150]]],
  ["o-1007", "r3", "m2", "cancelled", true, 30, [["p9", 2]], "Budget changed for this season."],
  ["o-1008", "r4", "m1", "quote_requested", true, 2, [["p24", 1], ["p28", 12]], "Looking for a 12-seat dining set for a private villa."],
  ["o-1009", "r1", "m1", "quoted", true, 4, [["p19", 2, 1400], ["p15", 2, 1620]]],
  ["o-1010", "r2", "m2", "completed", false, 60, [["p7", 2, 2200]]],
  ["o-1011", "r3", "m6", "confirmed", false, 7, [["p47", 48, 105]]],
  ["o-1012", "r1", "m3", "completed", true, 75, [["p5", 2, 2400]]],
  ["o-1013", "r4", "m2", "in_production", false, 12, [["p16", 4, 920], ["p4", 6, 760]]],
  ["o-1014", "r1", "m6", "quote_requested", true, 0, [["p42", 8], ["p45", 6]], "هل يتوفر تشطيب نحاسي داكن لمصباح الفانوس؟"],
];

export const orders: Order[] = orderRows.map(([id, retailerId, manufacturerId, status, isRFQ, created, items, note]) => ({
  id,
  retailerId,
  manufacturerId,
  status,
  isRFQ,
  note,
  createdAt: daysAgo(created, 3),
  items: items.map(([productId, qty, unitPrice]) => ({ productId, qty, unitPrice })),
  history: history(status, isRFQ, created),
}));

/* ------------------------------------------------------------------ */
/* Favorites                                                           */
/* ------------------------------------------------------------------ */

export const favorites: Favorite[] = [
  ["r1", "p3"], ["r1", "p10"], ["r1", "p23"], ["r1", "p41"], ["r1", "p44"], ["r1", "p31"],
  ["r2", "p8"], ["r2", "p25"], ["r3", "p14"], ["r4", "p47"],
].map(([retailerId, productId], i) => ({ id: `f${i + 1}`, retailerId, productId }));

/* ------------------------------------------------------------------ */
/* Conversations + messages                                            */
/* ------------------------------------------------------------------ */

export const conversations: Conversation[] = [
  { id: "cv-1", participantIds: ["u-r1", "u-m2"], orderId: "o-1001" },
  { id: "cv-2", participantIds: ["u-r2", "u-m3"], orderId: "o-1002" },
  { id: "cv-3", participantIds: ["u-r1", "u-m1"], orderId: "o-1009" },
  { id: "cv-4", participantIds: ["u-r3", "u-m1"], orderId: "o-1004" },
  { id: "cv-5", participantIds: ["u-r4", "u-m6"] },
  { id: "cv-6", participantIds: ["u-r1", "u-m4"], orderId: "o-1003" },
];

type MsgRow = [conversationId: string, senderId: string, body: string, d: number, h: number];
const msgRows: MsgRow[] = [
  ["cv-1", "u-r1", "مرحباً إمري، أرسلنا طلب عرض سعر لكنبة الساحل والكرسي الصدفي. هل يمكن تقديم التسليم إلى الأسبوع الأول من ديسمبر؟", 1, 4],
  ["cv-1", "u-m2", "Merhaba Abdullah — thank you! December is possible for the sofas. I'll confirm the lighter bouclé shade with our fabric supplier tomorrow.", 1, 2],
  ["cv-1", "u-r1", "ممتاز، بانتظار عرضكم.", 0, 20],
  ["cv-2", "u-m3", "Buongiorno Mariam, the quote is ready. Nocturne velvet is available in ink, moss and oxblood.", 4, 6],
  ["cv-2", "u-r2", "Lovely — ink for the sofa please. Can we get swatches couriered to Dubai?", 3, 9],
  ["cv-2", "u-m3", "Of course, swatches will ship today via DHL.", 3, 5],
  ["cv-3", "u-m1", "أهلاً عبدالله، أرفقنا عرض السعر للخزانة والسرير المنحوت. السعر يشمل التغليف الخشبي للتصدير.", 3, 10],
  ["cv-3", "u-r1", "شكراً عمر، سأراجع العرض مع فريق المشتريات وأعود إليك.", 2, 7],
  ["cv-4", "u-r3", "عمر، كيف يسير الإنتاج؟ نحتاج صوراً من الورشة للعميل.", 6, 3],
  ["cv-4", "u-m1", "الإنتاج في المرحلة الثانية — النجارة اكتملت ونبدأ التنجيد الأسبوع القادم. سأرسل الصور اليوم.", 5, 22],
  ["cv-5", "u-r4", "Hi Rania, do you offer the Andalus mirror in a larger size for a hotel lobby?", 9, 2],
  ["cv-5", "u-m6", "Hi Dana — yes, we can produce it at 120 × 240 cm on a made-to-order basis, around 4 weeks.", 8, 20],
  ["cv-6", "u-m4", "Order confirmed! Teak is selected and curing. Expected dispatch in 3 weeks.", 8, 1],
];

export const messages: Message[] = msgRows.map(([conversationId, senderId, body, d, h], i) => ({
  id: `msg-${i + 1}`,
  conversationId,
  senderId,
  body,
  createdAt: daysAgo(d, h),
}));

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

type NotifRow = [userId: string, type: string, body: string, d: number, read: boolean, href?: string, params?: Record<string, string>];
const notifRows: NotifRow[] = [
  ["u-m1", "order.rfq", "New quote request o-1008 from Zaha Interiors", 2, false, "/manufacturer/orders/o-1008", { order: "o-1008", company: "Zaha Interiors" }],
  ["u-m1", "message", "New message from Abdullah Al-Rashid", 2, false, "/manufacturer/messages", { name: "Abdullah Al-Rashid" }],
  ["u-m1", "order.status", "Order o-1004 moved to In production", 10, true, "/manufacturer/orders/o-1004", { order: "o-1004" }],
  ["u-m2", "order.rfq", "New quote request o-1001 from Bayt Showroom", 1, false, "/manufacturer/orders/o-1001", { order: "o-1001", company: "Bayt Showroom" }],
  ["u-m6", "order.rfq", "New quote request o-1014 from Bayt Showroom", 0, false, "/manufacturer/orders/o-1014", { order: "o-1014", company: "Bayt Showroom" }],
  ["u-r1", "order.quoted", "Damietta Atelier sent a quote for o-1009", 3, false, "/retailer/orders/o-1009", { order: "o-1009", company: "Damietta Atelier" }],
  ["u-r1", "order.status", "Order o-1003 confirmed by Jepara Teak Works", 9, true, "/retailer/orders/o-1003", { order: "o-1003" }],
  ["u-r1", "message", "New message from Emre Yılmaz", 1, false, "/retailer/messages", { name: "Emre Yılmaz" }],
  ["u-r2", "order.quoted", "Casa Brianza sent a quote for o-1002", 4, false, "/retailer/orders/o-1002", { order: "o-1002", company: "Casa Brianza" }],
  ["u-admin", "account.pending", "Nile Home Gallery applied for a retailer account", 1, false, "/admin/approvals", { company: "Nile Home Gallery" }],
  ["u-admin", "account.pending", "Marrakech Loom House applied for a manufacturer account", 2, false, "/admin/approvals", { company: "Marrakech Loom House" }],
  ["u-admin", "account.pending", "Lisboa Linen Co. applied for a manufacturer account", 4, true, "/admin/approvals", { company: "Lisboa Linen Co." }],
];

export const notifications: Notification[] = notifRows.map(([userId, type, body, d, read, href, params], i) => ({
  id: `n-${i + 1}`,
  userId,
  type,
  body,
  read,
  href,
  params,
  createdAt: daysAgo(d, i),
}));
