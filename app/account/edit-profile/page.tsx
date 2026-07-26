import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { updateProfileName, updatePassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const ROLE_LABEL: Record<string, string> = {
  staff: "Staff",
  document_controller: "Document Controller",
  admin: "Admin",
};

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: department } = user!.department_id
    ? await supabase
        .from("departments")
        .select("name")
        .eq("id", user!.department_id)
        .single()
    : { data: null };

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Edit Profile</h1>

      {params.error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">
          {params.error}
        </p>
      )}
      {params.message && (
        <p className="rounded bg-green-50 p-3 text-sm text-green-700">
          {params.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Profile Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={updateProfileName} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Full Name
              </label>
              <Input
                name="name"
                type="text"
                defaultValue={user!.name}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-fit cursor-pointer transition-transform active:scale-95"
            >
              Save Name
            </Button>
          </form>

          <Separator />

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Email
            </label>
            <Input type="text" value={user!.email} disabled />
            <p className="mt-1 text-xs text-muted-foreground">
              Contact a Document Controller or Admin to change your email.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Department
            </label>
            <Input
              type="text"
              value={department?.name ?? "Not assigned"}
              disabled
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Role
            </label>
            <Input
              type="text"
              value={ROLE_LABEL[user!.role] ?? user!.role}
              disabled
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Department and role can only be changed by a Document Controller
              or Admin.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePassword} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                New Password
              </label>
              <Input name="password" type="password" minLength={6} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Confirm New Password
              </label>
              <Input
                name="confirm_password"
                type="password"
                minLength={6}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-fit cursor-pointer transition-transform active:scale-95"
            >
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
