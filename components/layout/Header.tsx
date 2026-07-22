import { logout } from '@/app/auth/actions'
import type { CurrentUser } from '@/lib/types'

const ROLE_LABEL: Record<string, string> = {
  staff: 'Staff',
  document_controller: 'Document Controller',
  admin: 'Admin',
}

export function Header({ user }: { user: CurrentUser }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <div />

      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <p className="font-medium leading-tight">{user.name}</p>
          <p className="text-xs text-gray-500 leading-tight">
            {ROLE_LABEL[user.role] ?? user.role}
          </p>
        </div>

        {/* Form action ke Server Action — tidak butuh "use client" atau onClick */}
        <form action={logout}>
          <button
            type="submit"
            className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Logout
          </button>
        </form>
      </div>
    </header>
  )
}
