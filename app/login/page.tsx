import { login } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto mt-20 max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          {params.message && (
            <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">
              {params.message}
            </p>
          )}
          {params.error && (
            <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
              {params.error}
            </p>
          )}

          <form action={login} className="flex flex-col gap-3">
            <Input name="email" type="email" placeholder="Email" required />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              required
            />
            <Button
              type="submit"
              className="cursor-pointer transition-transform active:scale-95"
            >
              Login
            </Button>
          </form>

          <p className="mt-4 text-sm">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="underline">
              Sign up
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
