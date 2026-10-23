import type {
  AnalyticsRepository,
  ConversationSummary,
  MessageRepository,
  Order,
  OrderRepository,
  OrderStatus,
  TimePoint,
} from "../types";
import { notifyCompany } from "./accounts";
import { getTables, latency, mutate, NotFoundError, now, uid } from "./store";

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

/** Value of an order using quoted prices, falling back to the product's tier price for the quantity. */
export function orderValue(order: Order) {
  const products = new Map(getTables().products.map((p) => [p.id, p]));
  return order.items.reduce((sum, item) => {
    if (item.unitPrice != null) return sum + item.unitPrice * item.qty;
    const p = products.get(item.productId);
    if (!p) return sum;
    const tier = [...p.priceTiers].reverse().find((tr) => item.qty >= tr.minQty) ?? p.priceTiers[0];
    return sum + (tier?.unitPrice ?? 0) * item.qty;
  }, 0);
}

function companyName(id: string) {
  return getTables().companies.find((c) => c.id === id)?.name ?? id;
}

/** Statuses the manufacturer drives notify the retailer, and vice versa. */
const RETAILER_FACING: OrderStatus[] = ["quoted", "in_production", "shipped", "completed"];

// TODO(backend): order transitions must be validated server-side (state machine + ownership checks).
export const mockOrders: OrderRepository = {
  async list() {
    return latency([...getTables().orders].sort(byNewest));
  },
  async getById(id) {
    return latency(getTables().orders.find((o) => o.id === id) ?? null);
  },
  async listByRetailer(retailerId) {
    return latency(getTables().orders.filter((o) => o.retailerId === retailerId).sort(byNewest));
  },
  async listByManufacturer(manufacturerId) {
    return latency(getTables().orders.filter((o) => o.manufacturerId === manufacturerId).sort(byNewest));
  },
  async create(input) {
    const status: OrderStatus = input.isRFQ ? "quote_requested" : "confirmed";
    const items = input.isRFQ
      ? input.items.map(({ productId, qty }) => ({ productId, qty }))
      : input.items;
    const order: Order = {
      ...input,
      items,
      id: `o-${Math.floor(1100 + Math.random() * 8900)}`,
      status,
      createdAt: now(),
      history: [{ status, at: now() }],
    };
    mutate((t) => {
      t.orders.unshift(order);
      notifyCompany(t, input.manufacturerId, {
        type: input.isRFQ ? "order.rfq" : "order.new",
        body: `${input.isRFQ ? "New quote request" : "New order"} ${order.id} from ${companyName(input.retailerId)}`,
        href: `/manufacturer/orders/${order.id}`,
        params: { order: order.id, company: companyName(input.retailerId) },
      });
    });
    return latency(order, 500);
  },
  async submitQuote(id, prices) {
    const updated = mutate((t) => {
      const o = t.orders.find((x) => x.id === id);
      if (!o) throw new NotFoundError("Order", id);
      o.items = o.items.map((item) => ({ ...item, unitPrice: prices[item.productId] ?? item.unitPrice }));
      o.status = "quoted";
      o.history = [...(o.history ?? []), { status: "quoted", at: now() }];
      notifyCompany(t, o.retailerId, {
        type: "order.quoted",
        body: `${companyName(o.manufacturerId)} sent a quote for ${o.id}`,
        href: `/retailer/orders/${o.id}`,
        params: { order: o.id, company: companyName(o.manufacturerId) },
      });
      return o;
    });
    return latency(updated, 400);
  },
  async updateStatus(id, status) {
    const updated = mutate((t) => {
      const o = t.orders.find((x) => x.id === id);
      if (!o) throw new NotFoundError("Order", id);
      o.status = status;
      o.history = [...(o.history ?? []), { status, at: now() }];
      const toRetailer = RETAILER_FACING.includes(status);
      notifyCompany(t, toRetailer ? o.retailerId : o.manufacturerId, {
        type: "order.status",
        body: `Order ${o.id} is now ${status.replace(/_/g, " ")}`,
        href: `/${toRetailer ? "retailer" : "manufacturer"}/orders/${o.id}`,
        params: { order: o.id, status },
      });
      return o;
    });
    return latency(updated, 300);
  },
};

// TODO(backend): replace polling-by-subscribe with realtime channels (e.g. Supabase Realtime / websockets).
export const mockMessages: MessageRepository = {
  async listConversations(userId) {
    const t = getTables();
    const summaries: ConversationSummary[] = t.conversations
      .filter((c) => c.participantIds.includes(userId))
      .map((conversation) => {
        const msgs = t.messages.filter((m) => m.conversationId === conversation.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const lastRead = t.reads[`${conversation.id}:${userId}`] ?? "";
        return {
          conversation,
          otherParticipants: t.users.filter((u) => u.id !== userId && conversation.participantIds.includes(u.id)),
          lastMessage: msgs.at(-1),
          unread: msgs.filter((m) => m.senderId !== userId && m.createdAt > lastRead).length,
        };
      })
      .sort((a, b) => (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? ""));
    return latency(summaries, 150);
  },
  async getConversation(id) {
    return latency(getTables().conversations.find((c) => c.id === id) ?? null, 80);
  },
  async listMessages(conversationId) {
    const list = getTables()
      .messages.filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return latency(list, 120);
  },
  async send(conversationId, senderId, body) {
    const message = { id: uid("msg"), conversationId, senderId, body, createdAt: now() };
    mutate((t) => {
      t.messages.push(message);
      t.reads[`${conversationId}:${senderId}`] = message.createdAt;
      const conv = t.conversations.find((c) => c.id === conversationId);
      const sender = t.users.find((u) => u.id === senderId);
      for (const pid of conv?.participantIds ?? []) {
        if (pid === senderId) continue;
        const other = t.users.find((u) => u.id === pid);
        t.notifications.unshift({
          id: uid("n"),
          userId: pid,
          type: "message",
          body: `New message from ${sender?.name ?? "a member"}`,
          read: false,
          createdAt: now(),
          href: other?.role === "retailer" ? "/retailer/messages" : "/manufacturer/messages",
          params: { name: sender?.name ?? "" },
        });
      }
    });
    return latency(message, 150);
  },
  async startConversation(participantIds, orderId) {
    const t = getTables();
    const key = [...participantIds].sort().join("|");
    const existing = t.conversations.find((c) => [...c.participantIds].sort().join("|") === key && c.orderId === orderId);
    if (existing) return latency(existing, 80);
    const conversation = { id: uid("cv"), participantIds, orderId };
    mutate((tb) => tb.conversations.push(conversation));
    return latency(conversation, 150);
  },
  async markRead(conversationId, userId) {
    const t = getTables();
    const key = `${conversationId}:${userId}`;
    const latest = t.messages.filter((m) => m.conversationId === conversationId).reduce((max, m) => (m.createdAt > max ? m.createdAt : max), "");
    if (latest && (t.reads[key] ?? "") < latest) {
      mutate((tb) => {
        tb.reads[key] = latest;
      });
    }
    return latency(undefined, 40);
  },
};

/** Deterministic pseudo-random generator so charts are stable between renders. */
function seeded(seedText: string) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function dayLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

const OPEN: OrderStatus[] = ["quote_requested", "quoted", "confirmed", "in_production", "shipped"];
const BOOKED: OrderStatus[] = ["confirmed", "in_production", "shipped", "completed"];

// TODO(backend): views need a real analytics/event pipeline; orders aggregates become SQL views.
export const mockAnalytics: AnalyticsRepository = {
  async manufacturerStats(manufacturerId) {
    const t = getTables();
    const products = t.products.filter((p) => p.manufacturerId === manufacturerId);
    const orders = t.orders.filter((o) => o.manufacturerId === manufacturerId);
    const rand = seeded(manufacturerId);
    const base = 30 + products.filter((p) => p.published).length * 9;
    const viewsSeries: TimePoint[] = Array.from({ length: 30 }, (_, i) => {
      const weekday = new Date(dayLabel(29 - i)).getDay();
      const weekend = weekday === 5 || weekday === 6 ? 0.72 : 1;
      return { label: dayLabel(29 - i), value: Math.round((base + i * 1.6 + rand() * base * 0.6) * weekend) };
    });
    const ordersByStatus = Object.fromEntries(
      (["quote_requested", "quoted", "confirmed", "in_production", "shipped", "completed", "cancelled"] as OrderStatus[]).map((s) => [
        s,
        orders.filter((o) => o.status === s).length,
      ]),
    ) as Record<OrderStatus, number>;
    return latency({
      views30d: viewsSeries.reduce((s, p) => s + p.value, 0),
      viewsSeries,
      publishedProducts: products.filter((p) => p.published).length,
      draftProducts: products.filter((p) => !p.published).length,
      openOrders: orders.filter((o) => OPEN.includes(o.status)).length,
      pipelineValue: orders.filter((o) => OPEN.includes(o.status)).reduce((s, o) => s + orderValue(o), 0),
      ordersByStatus,
    }, 300);
  },

  async platformStats() {
    const t = getTables();
    const rand = seeded("platform");
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });
    const ordersSeries = months.map((m, i) => ({
      label: m,
      // historical baseline + whatever the seed/live data holds for that month
      value: Math.round(18 + i * 6 + rand() * 8) + t.orders.filter((o) => o.createdAt.startsWith(m)).length,
    }));
    const tops = t.categories.filter((c) => !c.parentId);
    const productsByCategory = tops.map((c) => ({
      label: c.id,
      value: t.products.filter((p) => p.categoryId === c.id || t.categories.find((x) => x.id === p.categoryId)?.parentId === c.id).length,
    }));
    const manufacturers = t.companies.filter((c) => c.type === "manufacturer" && c.verified);
    const topManufacturers = manufacturers
      .map((c) => {
        const os = t.orders.filter((o) => o.manufacturerId === c.id);
        return { companyId: c.id, name: c.name, orders: os.length, value: os.filter((o) => BOOKED.includes(o.status)).reduce((s, o) => s + orderValue(o), 0) };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    return latency({
      manufacturers: t.companies.filter((c) => c.type === "manufacturer").length,
      retailers: t.companies.filter((c) => c.type === "retailer").length,
      pendingApprovals: t.users.filter((u) => u.status === "pending").length,
      products: t.products.length,
      publishedProducts: t.products.filter((p) => p.published).length,
      orders: t.orders.length,
      gmv: t.orders.filter((o) => BOOKED.includes(o.status)).reduce((s, o) => s + orderValue(o), 0),
      ordersSeries,
      productsByCategory,
      topManufacturers,
    }, 300);
  },
};

