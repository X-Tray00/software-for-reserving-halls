import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getUser, isAdmin, logout } from '../auth'
import { useDark } from '../App'
import DarkModeToggle from './DarkModeToggle'

export default function Header({ title = 'Hall Reservation Sofia', leftContent }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const user = getUser()
  const [dark, toggleDark] = useDark()

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-center px-6 h-16 shadow-header"
      style={{ background: 'linear-gradient(135deg, #1a1a46 0%, #26265c 60%, #6b3f65 100%)' }}
    >
      {/* Left slot */}
      <div className="absolute left-5 top-1/2 -translate-y-1/2">
        {leftContent}
      </div>

      <h1 className="text-white font-semibold text-lg tracking-wide text-shadow-sm select-none">
        {title}
      </h1>

      {/* Right controls */}
      <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {/* Dark mode toggle */}
        <DarkModeToggle dark={dark} onToggle={toggleDark} />

        {/* User dropdown */}
        <div ref={ref}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors duration-200"
            style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', backdropFilter: 'blur(6px)' }}
          >
            <span className="text-base">👤</span>
            <span className="max-w-[100px] truncate">{user?.username ?? 'User'}</span>
            <span className="text-xs opacity-70">{open ? '▲' : '▼'}</span>
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-modal overflow-hidden z-50"
              >
                <DropLink href="#/profile">My Profile</DropLink>
                <DropLink href="#/history">My Reservations</DropLink>
                {isAdmin() && <DropLink href="#/reservations">All Reservations</DropLink>}
                <button
                  onClick={() => logout().catch(console.error)}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

function DropLink({ href, children }) {
  return (
    <a
      href={href}
      className="block px-4 py-3 text-sm font-medium text-h-text dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-gray-700 hover:text-h-accent transition-colors"
    >
      {children}
    </a>
  )
}
