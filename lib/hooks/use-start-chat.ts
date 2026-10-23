"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/data";

/** Opens (or creates) a conversation with a company's primary contact and navigates to it. */
export function useStartChat() {
  const router = useRouter();
  const { currentUser } = useAuth();

  return async (companyId: string, orderId?: string) => {
    if (!currentUser || currentUser.role === "admin") return;
    const members = await db.users.listByCompany(companyId);
    const contact = members.find((u) => u.status === "approved") ?? members[0];
    if (!contact) return;
    const conversation = await db.messages.startConversation([currentUser.id, contact.id], orderId);
    router.push(`/${currentUser.role}/messages?c=${conversation.id}`);
  };
}
