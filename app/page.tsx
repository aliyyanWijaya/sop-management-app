import { login } from '@/app/auth/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const params = await searchParams

  return (
    <div className="mx-auto mt-20 max-w-sm">
      <h1 className="mb-6 text-xl font-semibold">Login</h1>

      {params.message && (
        <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">{params.message}</p>
      )}
      {params.error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{params.error}</p>
      )}

      <form action={login} className="flex flex-col gap-3">
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
          className="rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black py-2 text-white">
          Login
        </button>
      </form>

      <p className="mt-4 text-sm">
        Belum punya akun? <a href="/signup" className="underline">Daftar</a>
      </p>
    </div>
  )
}
