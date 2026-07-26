"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfileName(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const name = (formData.get("name") as string)?.trim();

  if (!name) {
    redirect(
      "/account/edit-profile?error=" +
        encodeURIComponent("Name cannot be empty"),
    );
  }

  // RLS "users_update_own_limited" allows this. The
  // "trg_prevent_self_role_change" trigger only blocks role/department_id
  // changes for non-admins, so updating name here is unaffected.
  const { error } = await supabase
    .from("users")
    .update({ name })
    .eq("id", authUser!.id);

  if (error) {
    redirect(
      "/account/edit-profile?error=" + encodeURIComponent(error.message),
    );
  }

  // Name shows in the Header/Sidebar user info, so revalidate the whole
  // layout rather than just this page.
  revalidatePath("/", "layout");
  redirect(
    "/account/edit-profile?message=" + encodeURIComponent("Name updated"),
  );
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!password || password.length < 6) {
    redirect(
      "/account/edit-profile?error=" +
        encodeURIComponent("Password must be at least 6 characters"),
    );
  }

  if (password !== confirmPassword) {
    redirect(
      "/account/edit-profile?error=" +
        encodeURIComponent("Passwords do not match"),
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(
      "/account/edit-profile?error=" + encodeURIComponent(error.message),
    );
  }

  redirect(
    "/account/edit-profile?message=" + encodeURIComponent("Password updated"),
  );
}
