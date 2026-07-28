import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/authContext'

const NAV = [
  { to: '/quizzes', label: 'Quizzes' },
  { to: '/sessions', label: 'Sessions' },
]

export function AppLayout() {
  const { professor } = useAuth()

  return (
    <div className="min-h-svh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-3">
          <NavLink to="/quizzes" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="grid size-7 place-items-center rounded-lg bg-brand-600 text-sm text-white">
              Q
            </span>
            Live Quiz
          </NavLink>

          <nav className="flex flex-1 items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Becomes a real account menu once Step 8 lands. */}
          <div className="text-right text-xs">
            <p className="font-semibold text-slate-800">{professor?.displayName}</p>
            <p className="text-slate-400">{professor?.email}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
