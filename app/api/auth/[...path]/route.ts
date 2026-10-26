import { auth } from "@/lib/server/auth";
import { clientIp, limit, RULES, tooManyRequests, type Rule } from "@/lib/server/rate-limit";

const handlers = auth.handler();

/** Endpoints that guess passwords or send mail get a per-address budget before reaching Neon Auth. */
function ruleFor(path: string): [string, Rule] | null {
  if (path.startsWith("sign-in/")) return ["sign-in", RULES.signIn];
  if (path.startsWith("sign-up/")) return ["sign-up", RULES.signUp];
  if (path.startsWith("email-otp/") || path.startsWith("forget-password") || path.startsWith("send-verification-email")) return ["email-code", RULES.emailCode];
  return null;
}

export const { GET, PUT, DELETE, PATCH } = handlers;

export async function POST(request: Request, ctx: RouteContext<"/api/auth/[...path]">) {
  const { path } = await ctx.params;
  const rule = ruleFor(path.join("/"));
  if (rule) {
    const wait = await limit(`auth:${rule[0]}:${clientIp(request)}`, rule[1]);
    if (wait) return tooManyRequests(wait);
  }
  return handlers.POST(request as Parameters<typeof handlers.POST>[0], ctx as Parameters<typeof handlers.POST>[1]);
}
