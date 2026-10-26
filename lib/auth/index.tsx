"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createAuthClient } from "@neondatabase/auth/next";
import { db, type Company, type Role, type User } from "@/lib/data";
import { startRealtime } from "@/lib/realtime";

/**
 * Neon Auth (Managed Better Auth). The browser talks to the same-origin proxy at /api/auth;
 * the session cookie is what /api/data, /api/uploads and /api/realtime authorize against.
 * The marketplace account (role, status, company) comes from /api/me.
 */
export const authClient = createAuthClient();

export interface RegisterInput {
  role: Exclude<Role, "admin">;
  companyName: string;
  contactName: string;
  email: string;
  password: string;
  country: string;
  city: string;
  phone: string;
  /** optional; members are contacted on WhatsApp, falling back to `phone` */
  whatsapp?: string;
  about: string;
}

interface Me {
  signedIn: boolean;
  user: User | null;
  company: Company | null;
}

interface AuthValue {
  /** false until the session has been read */
  ready: boolean;
  currentUser: User | null;
  company: Company | null;
  isApproved: boolean;
  /** wholesale prices & ordering are gated to approved members (the server enforces it too) */
  canSeePrices: boolean;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  /**
   * Sign-up, step 1: creates the sign-in identity (or resumes an unfinished one with the same
   * password) and emails a 6-digit code. Resolves to the account when there is nothing to verify
   * (the identity already has a marketplace account), else null: ask for the code next.
   */
  startRegistration: (input: RegisterInput) => Promise<User | null>;
  /** Emails a fresh sign-up code. */
  resendRegistrationCode: (email: string) => Promise<void>;
  /** Sign-up, step 2: verifies the code, then creates the company + pending account. */
  completeRegistration: (input: RegisterInput, code: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

async function fetchMe(): Promise<Me> {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return res.json();
}

/** Better Auth error codes -> the codes the auth forms translate. */
function authError(error: { code?: string; status?: number } | null | undefined, fallback: string) {
  const code = error?.code ?? "";
  if (error?.status === 429 || /RATE_LIMITED|TOO_MANY/i.test(code)) return new Error("RATE_LIMITED");
  if (code.includes("ALREADY_EXISTS")) return new Error("EMAIL_TAKEN");
  if (code.includes("INVALID") || error?.status === 401) return new Error("INVALID_CREDENTIALS");
  if (code.includes("EMAIL_NOT_VERIFIED")) return new Error("VERIFY_EMAIL");
  if (code.includes("PASSWORD")) return new Error("WEAK_PASSWORD");
  return new Error(code || fallback);
}

/** The Neon client either returns `{ data, error }` or throws an AuthApiError; normalize both to a result. */
async function settle<T>(call: () => Promise<{ data: T; error: { code?: string; status?: number } | null }>) {
  try {
    return await call();
  } catch (e) {
    const err = e as { code?: string; status?: number; message?: string };
    return { data: null, error: { code: err.code ?? err.message, status: err.status } };
  }
}

export function homeFor(user: Pick<User, "role" | "status"> | null) {
  if (!user) return "/";
  if (user.status === "pending") return "/pending-approval";
  return `/${user.role}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me>({ signedIn: false, user: null, company: null });
  const [version, setVersion] = useState(0);

  useEffect(() => db.subscribe(() => setVersion((v) => v + 1)), []);

  // Re-read the account whenever data changes (approval, profile edits, Realtime events).
  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((next) => !cancelled && setMe(next))
      .catch(() => {
        // keep the last known account; the next change retries
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const userId = me.user?.id;
  useEffect(() => (userId ? startRealtime(userId) : undefined), [userId]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await settle(() => authClient.signIn.email({ email, password }));
    if (error) throw authError(error, "INVALID_CREDENTIALS");
    const next = await fetchMe();
    if (!next.user) {
      // a valid identity with no marketplace account (e.g. sign-up interrupted before /api/register)
      await authClient.signOut();
      throw new Error("NO_USER");
    }
    setMe(next);
    return next.user;
  }, []);

  const resendRegistrationCode = useCallback(async (email: string) => {
    const { error } = await settle(() => authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" }));
    if (error) throw authError(error, "CODE_NOT_SENT");
  }, []);

  const startRegistration = useCallback(
    async (input: RegisterInput) => {
      const signUp = await settle(() => authClient.signUp.email({ email: input.email, password: input.password, name: input.contactName }));
      if (signUp.error) {
        const failure = authError(signUp.error, "SIGN_UP_FAILED");
        if (failure.message !== "EMAIL_TAKEN") throw failure;
        // The identity exists. With the right password this is the same person finishing an
        // earlier sign-up (or an existing member): continue as them; otherwise the email is taken.
        const signIn = await settle(() => authClient.signIn.email({ email: input.email, password: input.password }));
        if (signIn.error) throw failure;
      }
      const next = await fetchMe();
      if (!next.signedIn) throw new Error("VERIFY_EMAIL");
      if (next.user) {
        setMe(next);
        return next.user;
      }
      await resendRegistrationCode(input.email);
      return null;
    },
    [resendRegistrationCode],
  );

  const completeRegistration = useCallback(async (input: RegisterInput, code: string) => {
    const verified = await settle(() => authClient.emailOtp.verifyEmail({ email: input.email, otp: code }));
    if (verified.error) {
      const failure = authError(verified.error, "INVALID_CODE");
      throw failure.message === "RATE_LIMITED" ? failure : new Error("INVALID_CODE");
    }
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        role: input.role,
        contactName: input.contactName,
        companyName: input.companyName,
        country: input.country,
        city: input.city,
        phone: input.phone,
        whatsapp: input.whatsapp || undefined,
        about: input.about,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { user?: User; company?: Company | null; error?: string };
    if (!res.ok || !body.user) throw new Error(body.error ?? "SIGN_UP_FAILED");
    setMe({ signedIn: true, user: body.user, company: body.company ?? null });
    return body.user;
  }, []);

  const logout = useCallback(async () => {
    await authClient.signOut();
    // A full load drops every cached query, the Realtime client and the previous account's rows.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load is the point here
    window.location.assign("/");
  }, []);

  const value = useMemo<AuthValue>(() => {
    const isApproved = me.user?.status === "approved";
    return {
      ready,
      currentUser: me.user,
      company: me.company,
      isApproved,
      canSeePrices: isApproved,
      loginWithEmail,
      startRegistration,
      resendRegistrationCode,
      completeRegistration,
      logout,
    };
  }, [ready, me, loginWithEmail, startRegistration, resendRegistrationCode, completeRegistration, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
