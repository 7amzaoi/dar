import type { Notification, NotificationRepository, User, UserRepository } from "../types";
import { getTables, latency, mutate, NotFoundError, now, uid } from "./store";

/** Push a notification to every user of a company (used by order/message side effects). */
export function notifyCompany(t: ReturnType<typeof getTables>, companyId: string, n: Omit<Notification, "id" | "read" | "createdAt" | "userId">) {
  for (const u of t.users) {
    if (u.companyId === companyId && u.status === "approved") {
      t.notifications.unshift({ ...n, id: uid("n"), userId: u.id, read: false, createdAt: now() });
    }
  }
}

export function notifyAdmins(t: ReturnType<typeof getTables>, n: Omit<Notification, "id" | "read" | "createdAt" | "userId">) {
  for (const u of t.users) {
    if (u.role === "admin") t.notifications.unshift({ ...n, id: uid("n"), userId: u.id, read: false, createdAt: now() });
  }
}

export const mockUsers: UserRepository = {
  async list(filter = {}) {
    const q = filter.search?.trim().toLowerCase();
    const list = getTables()
      .users.filter(
        (u) =>
          (!filter.role || u.role === filter.role) &&
          (!filter.status || u.status === filter.status) &&
          (!q || `${u.name} ${u.email}`.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return latency(list);
  },
  async getById(id) {
    return latency(getTables().users.find((u) => u.id === id) ?? null, 60);
  },
  async getByEmail(email) {
    const e = email.trim().toLowerCase();
    return latency(getTables().users.find((u) => u.email.toLowerCase() === e) ?? null);
  },
  async listByCompany(companyId) {
    return latency(getTables().users.filter((u) => u.companyId === companyId));
  },
  // TODO(backend): user creation belongs to the auth provider's sign-up flow.
  async create(input) {
    const user: User = { status: "pending", ...input, id: uid("u"), createdAt: now() };
    mutate((t) => {
      t.users.push(user);
      if (user.status === "pending") {
        const company = t.companies.find((c) => c.id === user.companyId);
        notifyAdmins(t, {
          type: "account.pending",
          body: `${company?.name ?? user.name} applied for a ${user.role} account`,
          href: "/admin/approvals",
          params: { company: company?.name ?? user.name },
        });
      }
    });
    return latency(user, 500);
  },
  async update(id, patch) {
    const updated = mutate((t) => {
      const i = t.users.findIndex((u) => u.id === id);
      if (i < 0) throw new NotFoundError("User", id);
      t.users[i] = { ...t.users[i], ...patch, id };
      return t.users[i];
    });
    return latency(updated);
  },
  // TODO(backend): approval should be an admin-only server action that also sends an email.
  async setStatus(id, status) {
    const updated = mutate((t) => {
      const i = t.users.findIndex((u) => u.id === id);
      if (i < 0) throw new NotFoundError("User", id);
      t.users[i] = { ...t.users[i], status };
      if (status === "approved") {
        t.notifications.unshift({
          id: uid("n"),
          userId: id,
          type: "account.approved",
          body: "Your account has been approved. Welcome to Dār.",
          read: false,
          createdAt: now(),
        });
      }
      return t.users[i];
    });
    return latency(updated, 300);
  },
};

export const mockNotifications: NotificationRepository = {
  async listByUser(userId) {
    const list = getTables()
      .notifications.filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return latency(list, 140);
  },
  async unreadCount(userId) {
    return latency(getTables().notifications.filter((n) => n.userId === userId && !n.read).length, 60);
  },
  async markRead(id) {
    mutate((t) => {
      const n = t.notifications.find((x) => x.id === id);
      if (n) n.read = true;
    });
    return latency(undefined, 60);
  },
  async markAllRead(userId) {
    mutate((t) => {
      for (const n of t.notifications) if (n.userId === userId) n.read = true;
    });
    return latency(undefined, 120);
  },
  async create(input) {
    const n: Notification = { ...input, id: uid("n"), read: false, createdAt: now() };
    mutate((t) => t.notifications.unshift(n));
    return latency(n);
  },
};
