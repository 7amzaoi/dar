import "server-only";
import type { Company, User } from "@/lib/data/types";
import { auth } from "./auth";
import { findOrLinkAppUser, pg } from "./repositories";

export interface Viewer {
  /** Managed Better Auth user id, when signed in */
  authUserId: string | null;
  authEmail: string | null;
  /** the marketplace account linked to that identity */
  user: User | null;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    code: string,
  ) {
    super(code);
  }
}

export async function getViewer(): Promise<Viewer> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { authUserId: null, authEmail: null, user: null };
  const user = await findOrLinkAppUser(session.user.id, session.user.email, session.user.emailVerified);
  return { authUserId: session.user.id, authEmail: session.user.email, user };
}

export async function getViewerWithCompany(): Promise<Viewer & { company: Company | null }> {
  const viewer = await getViewer();
  const company = viewer.user?.companyId ? await pg.companies.getById(viewer.user.companyId) : null;
  return { ...viewer, company };
}
