import { redirect } from "next/navigation";

/** Collections are managed on the products page now; keep old links working. */
export default function CollectionsPage() {
  redirect("/manufacturer/products#collections");
}
