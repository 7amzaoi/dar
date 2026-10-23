import type { DataSource } from "../types";
import { mockNotifications, mockUsers } from "./accounts";
import { mockCategories, mockCollections, mockCompanies, mockFavorites, mockProducts } from "./catalog";
import { mockAnalytics, mockMessages, mockOrders } from "./commerce";
import { subscribe } from "./store";

export const mockDataSource: DataSource = {
  products: mockProducts,
  users: mockUsers,
  companies: mockCompanies,
  categories: mockCategories,
  collections: mockCollections,
  favorites: mockFavorites,
  orders: mockOrders,
  messages: mockMessages,
  notifications: mockNotifications,
  analytics: mockAnalytics,
  subscribe,
};

export { resetMockData } from "./store";
export { DEMO_USER_BY_ROLE, CATEGORY_COVERS } from "./seed";
