import { signup } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

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
      <h1 className="mb-6 text-xl font-semibold">Sign Up</h1>

      {params.error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {params.error}
        </p>
      )}

      <form action={signup} className="flex flex-col gap-3">
        <input
          name="name"
          type="text"
          placeholder="Full name"
          required
          className="rounded border px-3 py-2"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded border px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={6}
          className="rounded border px-3 py-2"
        />
        <select
          name="department_id"
          required
          className="rounded border px-3 py-2"
        >
          <option value="">Select department</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <Button type="submit">Sign Up</Button>
      </form>

      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <a href="/login" className="underline">
          Login
        </a>
      </p>
    </div>
  );
}
