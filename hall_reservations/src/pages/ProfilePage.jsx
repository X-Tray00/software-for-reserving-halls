import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { fetchUserReservations } from '../api'
import { requireAuth } from '../auth'

const ROLE_COLORS = {
  ADMIN: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  USER:  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
}

export default function ProfilePage() {
  const user = requireAuth()
  const navigate = useNavigate()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchUserReservations()
      .then(data => setReservations(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (!user) return null

  const roles = user.roles ?? []
  const statusCounts = ['active', 'inProgress', 'done'].reduce((acc, s) => {
    acc[s] = reservations.filter(r => r.status === s).length
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-page-gradient">
      <Header
        leftContent={
          <button
            onClick={() => navigate('/halls')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-lg transition-transform hover:scale-110"
            style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', backdropFilter: 'blur(6px)' }}
          >
            ←
          </button>
        }
      />

      <div className="max-w-[500px] mx-auto px-4 mt-10 mb-10">
        {/* Avatar + name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-[18px] shadow-card px-8 py-8 text-center mb-4"
        >
          <div
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #26265c, #a05d97)' }}
          >
            {(user.username ?? '?')[0].toUpperCase()}
          </div>

          <h2 className="text-h-primary dark:text-blue-200 font-bold text-2xl mb-1">{user.username}</h2>

          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {roles.map(role => (
              <span
                key={role}
                className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${ROLE_COLORS[role.toUpperCase()] ?? ROLE_COLORS.USER}`}
              >
                {role}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Reservation stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-[18px] shadow-card px-6 py-5"
        >
          <h3 className="text-h-primary dark:text-gray-200 font-semibold text-[15px] mb-4">My Reservations</h3>

          {loading ? (
            <div className="flex justify-center py-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-8 h-8 border-4 border-h-mid border-t-transparent rounded-full"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Active',      color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200', count: statusCounts.active },
                  { label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200',           count: statusCounts.inProgress },
                  { label: 'Done',        color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200',       count: statusCounts.done },
                ].map(s => (
                  <div key={s.label} className={`rounded-[12px] border px-3 py-2.5 text-center ${s.color}`}>
                    <p className="text-xl font-bold">{s.count}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-h-muted dark:text-gray-400 text-sm text-center">
                Total: <strong className="text-h-text dark:text-gray-200">{reservations.length}</strong> reservation{reservations.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => navigate('/history')}
                className="mt-4 w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #26265c, #a05d97)' }}
              >
                View My Reservations →
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
