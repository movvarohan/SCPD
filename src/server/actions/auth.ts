"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTH_COOKIE } from "@/lib/auth";

export async function switchUser(userId: string) {
  const store = await cookies();
  store.set(AUTH_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}
