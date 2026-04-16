import { useNavigate } from 'react-router-dom'
import { authClient } from '../lib/auth-client'

export default function Navbar() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => navigate('/login'),
      },
    })
  }

  const initials = session?.user.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4">
      {/* Brand */}
      <div className="flex items-center gap-2.5 mr-auto">
        <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" />
          </svg>
        </div>
        <span className="font-semibold text-gray-900 text-sm tracking-tight">Helpdesk</span>
      </div>

      {/* User */}
      {session && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-600">{initials}</span>
            </div>
            <span className="text-sm text-gray-700 font-medium hidden sm:block">{session.user.name}</span>
          </div>

          <div className="w-px h-5 bg-gray-200" />

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
