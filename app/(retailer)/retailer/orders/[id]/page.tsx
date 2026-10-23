"use client";

import { use } from "react";
import { OrderDetail } from "@/components/dashboard/orders";

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OrderDetail side="retailer" id={id} />;
}
