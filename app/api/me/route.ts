import { getViewerWithCompany } from "@/lib/server/viewer";

export const dynamic = "force-dynamic";

/** The signed-in marketplace account (or nulls). Links a seeded user by email on first sign-in. */
export async function GET() {
  const { authUserId, authEmail, user, company } = await getViewerWithCompany();
  return Response.json({ signedIn: !!authUserId, email: authEmail, user, company });
}
