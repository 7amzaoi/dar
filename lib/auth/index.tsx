"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { db, demoUserIdByRole, type Company, type Role, type User } from "@/lib/data";

/**
 * MOCK auth. Holds the "signed-in" user id in localStorage.
 *
 * TODO(backend): replace with the real auth provider's session (cookie/JWT),
 * server-side role checks (proxy.ts + server components), and real sign-up/sign-in.
 */

const SESSION_KEY = "dar.session";

export interface RegisterInput {
  role: Exclude<Role, "admin">;
  companyName: string;
  contactName: string;
  email: string;
  country: string;
  city: string;
  phone: string;
  /** optional; members are contacted on WhatsApp, falling back to `phone` */
  whatsapp?: string;
  about: string;
}

interface AuthValue {
  /** false until the session has been read on the client */
  ready: boolean;
  currentUser: User | null;
  company: Company | null;
  isApproved: boolean;
  /** wholesale prices & ordering are gated to approved members */
  canSeePrices: boolean;
  /** demo sign-in by role (used by the dev role switcher + demo buttons) */
  login: (role: Role) => Promise<User>;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function readSession(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(id: string | null) {
  try {
    if (id) window.localStorage.setItem(SESSION_KEY, id);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable — session lasts for this tab only
  }
}

export function homeFor(user: Pick<User, "role" | "status"> | null) {
  if (!user) return "/";
  if (user.status === "pending") return "/pending-approval";
  return `/${user.role}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  /** undefined = session not read yet; null = signed out */
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [version, setVersion] = useState(0);

  // Read the persisted session once on mount (async so it never blocks hydration).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(readSession()).then((id) => {
      if (!cancelled) setUserId(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => db.subscribe(() => setVersion((v) => v + 1)), []);

  // Resolve the user + company whenever the id or underlying data changes.
  useEffect(() => {
    if (userId === undefined) return;
    let cancelled = false;
    (async () => {
      const user = userId ? await db.users.getById(userId) : null;
      const comp = user?.companyId ? await db.companies.getById(user.companyId) : null;
      if (cancelled) return;
      setCurrentUser(user);
      setCompany(comp);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  const signIn = useCallback((user: User) => {
    writeSession(user.id);
    setUserId(user.id);
    setCurrentUser(user);
  }, []);

  const login = useCallback(
    async (role: Role) => {
      // TODO(backend): demo-only shortcut; remove when real auth lands.
      const user = await db.users.getById(demoUserIdByRole[role]);
      if (!user) throw new Error("Demo user missing");
      signIn(user);
      return user;
    },
    [signIn],
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      // TODO(backend): verify credentials with the auth provider. The mock accepts any password.
      void password;
      const user = await db.users.getByEmail(email);
      if (!user) throw new Error("NO_USER");
      signIn(user);
      return user;
    },
    [signIn],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      // TODO(backend): create the auth identity + company in one server transaction, send verification email.
      if (await db.users.getByEmail(input.email)) throw new Error("EMAIL_TAKEN");
      const comp = await db.companies.create({
        type: input.role,
        name: input.companyName,
        country: input.country,
        city: input.city,
        phone: input.phone,
        whatsapp: input.whatsapp || undefined,
        about: input.about,
        verified: false,
      });
      const user = await db.users.create({
        role: input.role,
        email: input.email,
        name: input.contactName,
        companyId: comp.id,
        status: "pending",
      });
      signIn(user);
      setCompany(comp);
      return user;
    },
    [signIn],
  );

  const logout = useCallback(() => {
    // TODO(backend): revoke the session server-side.
    writeSession(null);
    setUserId(null);
    setCurrentUser(null);
    setCompany(null);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const isApproved = currentUser?.status === "approved";
    return { ready, currentUser, company, isApproved, canSeePrices: isApproved, login, loginWithEmail, register, logout };
  }, [ready, currentUser, company, login, loginWithEmail, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
