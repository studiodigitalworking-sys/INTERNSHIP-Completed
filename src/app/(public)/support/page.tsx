import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function Support() {
  const u = await getUser();
  redirect(u ? (u.role === "STUDENT" ? "/dashboard/support" : "/admin/support") : "/contact");
}
