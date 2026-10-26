import { auth } from "@/lib/server/auth";

export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
