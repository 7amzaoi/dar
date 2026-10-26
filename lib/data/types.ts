/**
 * Domain entities + repository contracts.
 *
 * This file is the seam between the UI and persistence. The UI only ever sees
 * these types and the `db` object exported from `@/lib/data`. Swapping the mock
 * implementation for a real database means implementing these interfaces again
 * (e.g. against Supabase/Postgres) — no UI code changes.
 */

/* ------------------------------------------------------------------ */
/* Entities                                                            */
/* ------------------------------------------------------------------ */

export type Role = "manufacturer" | "retailer" | "admin";
export type AccountStatus = "pending" | "approved" | "suspended";

export interface User {
  id: string;
  role: Role;
  email: string;
  name: string;
  status: AccountStatus;
  /** Company.id — empty string for platform admins */
  companyId: string;
  createdAt: string;
}

export interface Company {
  id: string;
  type: "manufacturer" | "retailer";
  name: string;
  logoUrl?: string;
  country: string;
  city: string;
  /** primary (Arabic) description */
  about: string;
  /** optional English description; UI falls back to `about` */
  aboutEn?: string;
  phone: string;
  /**
   * WhatsApp number, international format (e.g. "+966 11 482 9930").
   * Members talk to each other on WhatsApp; falls back to `phone` when empty.
   */
  whatsapp?: string;
  verified: boolean;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  parentId?: string;
}

export interface PriceTier {
  minQty: number;
  unitPrice: number;
  currency: string;
}

export type StockStatus = "in_stock" | "made_to_order" | "out_of_stock";

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
  unit: "cm";
}

export interface Product {
  id: string;
  /** -> Company.id */
  manufacturerId: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  categoryId: string;
  images: string[];
  materials: string[];
  colors: string[];
  dimensions: Dimensions;
  /** wholesale tiered pricing, ascending by minQty */
  priceTiers: PriceTier[];
  minOrderQty: number;
  stockStatus: StockStatus;
  leadTimeDays?: number;
  collectionId?: string;
  published: boolean;
  createdAt: string;
}

export interface Collection {
  id: string;
  manufacturerId: string;
  nameAr: string;
  nameEn: string;
  coverUrl?: string;
}

export interface Favorite {
  id: string;
  /** retailer Company.id */
  retailerId: string;
  productId: string;
}

export type OrderStatus =
  | "quote_requested"
  | "quoted"
  | "confirmed"
  | "in_production"
  | "shipped"
  | "completed"
  | "cancelled";

export interface OrderItem {
  productId: string;
  qty: number;
  unitPrice?: number;
}

export interface OrderHistoryEntry {
  status: OrderStatus;
  at: string;
}

export interface Order {
  id: string;
  /** retailer Company.id */
  retailerId: string;
  /** manufacturer Company.id */
  manufacturerId: string;
  items: OrderItem[];
  status: OrderStatus;
  /** request-for-quote vs direct order */
  isRFQ: boolean;
  note?: string;
  createdAt: string;
  /** status transitions, used for the tracking timeline */
  history?: OrderHistoryEntry[];
}

export interface Notification {
  id: string;
  userId: string;
  /** e.g. "order.rfq", "order.quoted", "order.status", "account.pending", "account.approved" */
  type: string;
  body: string;
  read: boolean;
  createdAt: string;
  /** optional in-app link */
  href?: string;
  /** values for the localized message template keyed by `type`; `body` is the plain fallback */
  params?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* Query + input shapes                                                */
/* ------------------------------------------------------------------ */

export type ProductSort = "newest" | "price_asc" | "price_desc" | "title";

export interface ProductFilter {
  search?: string;
  /** matches the category itself and any of its children */
  categoryId?: string;
  materials?: string[];
  colors?: string[];
  priceMin?: number;
  priceMax?: number;
  stockStatus?: StockStatus[];
  countries?: string[];
  manufacturerId?: string;
  collectionId?: string;
  /** defaults to true for public listings */
  publishedOnly?: boolean;
  sort?: ProductSort;
}

export type NewProduct = Omit<Product, "id" | "createdAt">;
export type NewCompany = Omit<Company, "id">;
export type NewCategory = Omit<Category, "id">;
export type NewCollection = Omit<Collection, "id">;

export interface NewUser {
  role: Role;
  email: string;
  name: string;
  companyId: string;
  status?: AccountStatus;
}

export interface NewOrder {
  retailerId: string;
  manufacturerId: string;
  items: OrderItem[];
  isRFQ: boolean;
  note?: string;
}

export interface UserFilter {
  role?: Role;
  status?: AccountStatus;
  search?: string;
}

export interface CompanyFilter {
  type?: Company["type"];
  verified?: boolean;
  search?: string;
}

export interface TimePoint {
  label: string;
  value: number;
}

export interface ManufacturerStats {
  views30d: number;
  viewsSeries: TimePoint[];
  publishedProducts: number;
  draftProducts: number;
  openOrders: number;
  pipelineValue: number;
  ordersByStatus: Record<OrderStatus, number>;
}

export interface PlatformStats {
  manufacturers: number;
  retailers: number;
  pendingApprovals: number;
  products: number;
  publishedProducts: number;
  orders: number;
  gmv: number;
  ordersSeries: TimePoint[];
  productsByCategory: TimePoint[];
  topManufacturers: { companyId: string; name: string; orders: number; value: number }[];
}

/* ------------------------------------------------------------------ */
/* Repository contracts — every method is async                         */
/* ------------------------------------------------------------------ */

export interface ProductRepository {
  list(filter?: ProductFilter): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  getMany(ids: string[]): Promise<Product[]>;
  listByManufacturer(manufacturerId: string): Promise<Product[]>;
  create(input: NewProduct): Promise<Product>;
  update(id: string, patch: Partial<Product>): Promise<Product>;
  remove(id: string): Promise<void>;
  /** distinct facet values across published products, for filter UIs */
  facets(): Promise<{ materials: string[]; colors: string[]; countries: string[]; priceMax: number }>;
}

export interface UserRepository {
  list(filter?: UserFilter): Promise<User[]>;
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  listByCompany(companyId: string): Promise<User[]>;
  create(input: NewUser): Promise<User>;
  update(id: string, patch: Partial<User>): Promise<User>;
  setStatus(id: string, status: AccountStatus): Promise<User>;
}

export interface CompanyRepository {
  list(filter?: CompanyFilter): Promise<Company[]>;
  getById(id: string): Promise<Company | null>;
  create(input: NewCompany): Promise<Company>;
  update(id: string, patch: Partial<Company>): Promise<Company>;
}

export interface CategoryRepository {
  list(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(input: NewCategory): Promise<Category>;
  update(id: string, patch: Partial<Category>): Promise<Category>;
  remove(id: string): Promise<void>;
}

export interface CollectionRepository {
  list(): Promise<Collection[]>;
  listByManufacturer(manufacturerId: string): Promise<Collection[]>;
  getById(id: string): Promise<Collection | null>;
  create(input: NewCollection): Promise<Collection>;
  update(id: string, patch: Partial<Collection>): Promise<Collection>;
  remove(id: string): Promise<void>;
}

export interface FavoriteRepository {
  listByRetailer(retailerId: string): Promise<Favorite[]>;
  toggle(retailerId: string, productId: string): Promise<boolean>;
  remove(retailerId: string, productId: string): Promise<void>;
}

export interface OrderRepository {
  list(): Promise<Order[]>;
  getById(id: string): Promise<Order | null>;
  listByRetailer(retailerId: string): Promise<Order[]>;
  listByManufacturer(manufacturerId: string): Promise<Order[]>;
  create(input: NewOrder): Promise<Order>;
  /** manufacturer responds to an RFQ with unit prices per productId */
  submitQuote(id: string, prices: Record<string, number>): Promise<Order>;
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
}

export interface NotificationRepository {
  listByUser(userId: string): Promise<Notification[]>;
  unreadCount(userId: string): Promise<number>;
  markRead(id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  create(input: Omit<Notification, "id" | "read" | "createdAt">): Promise<Notification>;
}

export interface AnalyticsRepository {
  manufacturerStats(manufacturerId: string): Promise<ManufacturerStats>;
  platformStats(): Promise<PlatformStats>;
}

/** The single object the UI consumes. */
export interface DataSource {
  products: ProductRepository;
  users: UserRepository;
  companies: CompanyRepository;
  categories: CategoryRepository;
  collections: CollectionRepository;
  favorites: FavoriteRepository;
  orders: OrderRepository;
  notifications: NotificationRepository;
  analytics: AnalyticsRepository;
  /**
   * Subscribe to "something changed" events so views can refetch.
   * Mock: fired after every mutation. Real DB: wire to realtime channels or
   * a query-cache invalidation.
   */
  subscribe(listener: () => void): () => void;
}
