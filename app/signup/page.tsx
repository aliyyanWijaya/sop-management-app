import { signup } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Departments dropdown — this table is readable by anyone (see RLS
  // policy "departments_select_all"), so it's safe to call before login.
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name");

  return (
    <div className="mx-auto mt-20 max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          {params.error && (
            <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
              {params.error}
            </p>
          )}

          <form action={signup} className="flex flex-col gap-3">
            <Input name="name" type="text" placeholder="Full name" required />
            <Input name="email" type="email" placeholder="Email" required />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              required
              minLength={6}
            />

            {/* `name` on Select renders a hidden bubbled input synced to the
                selected value, so it submits normally with the surrounding
                <form action={...}> server action — no client state needed. */}
            <Select name="department_id" required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="submit"
              className="cursor-pointer transition-transform active:scale-95"
            >
              Sign Up
            </Button>
          </form>

          <p className="mt-4 text-sm">
            Already have an account?{" "}
            <a href="/login" className="underline">
              Login
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
