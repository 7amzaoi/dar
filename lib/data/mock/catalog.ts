import type {
  CategoryRepository,
  CollectionRepository,
  CompanyRepository,
  FavoriteRepository,
  Product,
  ProductFilter,
  ProductRepository,
} from "../types";
import { getTables, latency, mutate, NotFoundError, now, uid } from "./store";

/** Base (MOQ-tier) price, used for price filters and sorting. */
export function basePrice(p: Product) {
  return p.priceTiers[0]?.unitPrice ?? 0;
}

function categoryAndChildren(categoryId: string) {
  const ids = new Set([categoryId]);
  for (const c of getTables().categories) if (c.parentId === categoryId) ids.add(c.id);
  return ids;
}

// TODO(backend): replace with a SQL query / full-text search (e.g. Postgres tsvector) + pagination.
export const mockProducts: ProductRepository = {
  async list(filter: ProductFilter = {}) {
    const t = getTables();
    const { publishedOnly = true } = filter;
    const companyById = new Map(t.companies.map((c) => [c.id, c]));
    const cats = filter.categoryId ? categoryAndChildren(filter.categoryId) : null;
    const q = filter.search?.trim().toLowerCase();

    let out = t.products.filter((p) => {
      if (publishedOnly && !p.published) return false;
      if (cats && !cats.has(p.categoryId)) return false;
      if (filter.manufacturerId && p.manufacturerId !== filter.manufacturerId) return false;
      if (filter.collectionId && p.collectionId !== filter.collectionId) return false;
      if (filter.materials?.length && !filter.materials.some((m) => p.materials.includes(m))) return false;
      if (filter.colors?.length && !filter.colors.some((c) => p.colors.includes(c))) return false;
      if (filter.stockStatus?.length && !filter.stockStatus.includes(p.stockStatus)) return false;
      const price = basePrice(p);
      if (filter.priceMin != null && price < filter.priceMin) return false;
      if (filter.priceMax != null && price > filter.priceMax) return false;
      const company = companyById.get(p.manufacturerId);
      if (filter.countries?.length && (!company || !filter.countries.includes(company.country))) return false;
      if (q) {
        const hay = [p.titleAr, p.titleEn, p.descriptionEn, p.descriptionAr, company?.name ?? "", ...p.materials].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    switch (filter.sort ?? "newest") {
      case "price_asc":
        out = out.sort((a, b) => basePrice(a) - basePrice(b));
        break;
      case "price_desc":
        out = out.sort((a, b) => basePrice(b) - basePrice(a));
        break;
      case "title":
        out = out.sort((a, b) => a.titleEn.localeCompare(b.titleEn));
        break;
      default:
        out = out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return latency(out);
  },

  async getById(id) {
    return latency(getTables().products.find((p) => p.id === id) ?? null);
  },

  async getMany(ids) {
    const set = new Set(ids);
    return latency(getTables().products.filter((p) => set.has(p.id)));
  },

  async listByManufacturer(manufacturerId) {
    const list = getTables()
      .products.filter((p) => p.manufacturerId === manufacturerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return latency(list);
  },

  // TODO(backend): enforce on the server that the caller owns `manufacturerId`.
  async create(input) {
    const product: Product = { ...input, id: uid("p"), createdAt: now() };
    mutate((t) => t.products.unshift(product));
    return latency(product, 400);
  },

  async update(id, patch) {
    const updated = mutate((t) => {
      const i = t.products.findIndex((p) => p.id === id);
      if (i < 0) throw new NotFoundError("Product", id);
      t.products[i] = { ...t.products[i], ...patch, id };
      return t.products[i];
    });
    return latency(updated, 300);
  },

  async remove(id) {
    mutate((t) => {
      t.products = t.products.filter((p) => p.id !== id);
      t.favorites = t.favorites.filter((f) => f.productId !== id);
    });
    return latency(undefined, 250);
  },

  async facets() {
    const t = getTables();
    const published = t.products.filter((p) => p.published);
    const companyById = new Map(t.companies.map((c) => [c.id, c]));
    const uniq = (xs: string[]) => [...new Set(xs)].sort();
    return latency({
      materials: uniq(published.flatMap((p) => p.materials)),
      colors: uniq(published.flatMap((p) => p.colors)),
      countries: uniq(published.map((p) => companyById.get(p.manufacturerId)?.country ?? "").filter(Boolean)),
      priceMax: Math.ceil(Math.max(0, ...published.map(basePrice)) / 100) * 100,
    }, 120);
  },
};

export const mockCompanies: CompanyRepository = {
  async list(filter = {}) {
    const q = filter.search?.trim().toLowerCase();
    const list = getTables().companies.filter(
      (c) =>
        (!filter.type || c.type === filter.type) &&
        (filter.verified == null || c.verified === filter.verified) &&
        (!q || `${c.name} ${c.city}`.toLowerCase().includes(q)),
    );
    return latency(list);
  },
  async getById(id) {
    return latency(getTables().companies.find((c) => c.id === id) ?? null);
  },
  async create(input) {
    const company = { ...input, id: uid(input.type === "manufacturer" ? "m" : "r") };
    mutate((t) => t.companies.push(company));
    return latency(company);
  },
  async update(id, patch) {
    const updated = mutate((t) => {
      const i = t.companies.findIndex((c) => c.id === id);
      if (i < 0) throw new NotFoundError("Company", id);
      t.companies[i] = { ...t.companies[i], ...patch, id };
      return t.companies[i];
    });
    return latency(updated, 300);
  },
};

export const mockCategories: CategoryRepository = {
  async list() {
    return latency(getTables().categories, 100);
  },
  async getById(id) {
    return latency(getTables().categories.find((c) => c.id === id) ?? null);
  },
  async create(input) {
    const category = { ...input, id: uid("c") };
    mutate((t) => t.categories.push(category));
    return latency(category);
  },
  async update(id, patch) {
    const updated = mutate((t) => {
      const i = t.categories.findIndex((c) => c.id === id);
      if (i < 0) throw new NotFoundError("Category", id);
      t.categories[i] = { ...t.categories[i], ...patch, id };
      return t.categories[i];
    });
    return latency(updated);
  },
  // TODO(backend): decide on FK behaviour (block vs. re-parent) for categories in use.
  async remove(id) {
    const inUse = getTables().products.some((p) => p.categoryId === id) || getTables().categories.some((c) => c.parentId === id);
    if (inUse) throw new Error("CATEGORY_IN_USE");
    mutate((t) => {
      t.categories = t.categories.filter((c) => c.id !== id);
    });
    return latency(undefined);
  },
};

export const mockCollections: CollectionRepository = {
  async list() {
    return latency(getTables().collections);
  },
  async listByManufacturer(manufacturerId) {
    return latency(getTables().collections.filter((c) => c.manufacturerId === manufacturerId));
  },
  async getById(id) {
    return latency(getTables().collections.find((c) => c.id === id) ?? null);
  },
  async create(input) {
    const collection = { ...input, id: uid("col") };
    mutate((t) => t.collections.push(collection));
    return latency(collection);
  },
  async update(id, patch) {
    const updated = mutate((t) => {
      const i = t.collections.findIndex((c) => c.id === id);
      if (i < 0) throw new NotFoundError("Collection", id);
      t.collections[i] = { ...t.collections[i], ...patch, id };
      return t.collections[i];
    });
    return latency(updated);
  },
  async remove(id) {
    mutate((t) => {
      t.collections = t.collections.filter((c) => c.id !== id);
      t.products = t.products.map((p) => (p.collectionId === id ? { ...p, collectionId: undefined } : p));
    });
    return latency(undefined);
  },
};

export const mockFavorites: FavoriteRepository = {
  async listByRetailer(retailerId) {
    return latency(getTables().favorites.filter((f) => f.retailerId === retailerId), 120);
  },
  async toggle(retailerId, productId) {
    const added = mutate((t) => {
      const exists = t.favorites.some((f) => f.retailerId === retailerId && f.productId === productId);
      if (exists) {
        t.favorites = t.favorites.filter((f) => !(f.retailerId === retailerId && f.productId === productId));
        return false;
      }
      t.favorites.push({ id: uid("f"), retailerId, productId });
      return true;
    });
    return latency(added, 120);
  },
  async remove(retailerId, productId) {
    mutate((t) => {
      t.favorites = t.favorites.filter((f) => !(f.retailerId === retailerId && f.productId === productId));
    });
    return latency(undefined, 120);
  },
};
