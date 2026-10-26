import { z } from "zod";
import { pg, registerAppUser } from "@/lib/server/repositories";
import { getViewer } from "@/lib/server/viewer";

const body = z.object({
  role: z.enum(["manufacturer", "retailer"]),
  contactName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(160),
  country: z.string().trim().min(2).max(80),
  city: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(40),
  whatsapp: z.string().trim().max(40).optional(),
  about: z.string().trim().min(1).max(2000),
});

/**
 * Second half of sign-up: the browser has just created the Managed Better Auth identity
 * (signUp.email), so the session cookie is set. Create the company + pending account for it.
 */
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer.authUserId || !viewer.authEmail) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  // Already linked (or a seeded account with this email was just linked): nothing to create.
  if (viewer.user) return Response.json({ user: viewer.user, company: viewer.user.companyId ? await pg.companies.getById(viewer.user.companyId) : null });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const { role, contactName, companyName, ...company } = parsed.data;
  let user;
  try {
    user = await registerAppUser({ authUserId: viewer.authUserId, email: viewer.authEmail, name: contactName, role, company: { ...company, name: companyName } });
  } catch (error) {
    // unique_violation on app_users.email: a seeded account owns this address (link it by verifying the email)
    if ((error as { cause?: { code?: string }; code?: string }).cause?.code === "23505" || (error as { code?: string }).code === "23505") {
      return Response.json({ error: "EMAIL_TAKEN" }, { status: 409 });
    }
    throw error;
  }
  return Response.json({ user, company: await pg.companies.getById(user.companyId) }, { status: 201 });
}
