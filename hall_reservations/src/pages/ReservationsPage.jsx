import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
import { fetchAdminReservations, cancelReservation, fetchReservationSummary, updateReservationStatus, fetchWaitlist } from '../api'
import { requireAuth, isAdmin } from '../auth'

const STATUS_FILTERS = ['All', 'active', 'inProgress', 'done']
const STATUS_LABELS  = { active: 'Active', inProgress: 'In Progress', done: 'Done' }

export default function ReservationsPage() {
  const user = requireAuth()
  const navigate = useNavigate()
  const [reservations, setReservations] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [tab, setTab] = useState('reservations') // 'reservations' | 'waitlist'
  const [waitlist, setWaitlist] = useState([])
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!user) return
    if (!isAdmin()) { window.location.href = '#/halls'; return }
    load()
  }, [])

  function load() {
    setLoading(true)
    Promise.all([fetchAdminReservations(), fetchReservationSummary()])
      .then(([data, sum]) => { setReservations(data || []); setSummary(sum) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  function loadWaitlist() {
    setWaitlistLoading(true)
    fetchWaitlist()
      .then(data => setWaitlist(data || []))
      .catch(console.error)
      .finally(() => setWaitlistLoading(false))
  }

  function switchTab(t) {
    setTab(t)
    if (t === 'waitlist' && waitlist.length === 0) loadWaitlist()
  }

  async function handleStatusChange(id, status) {
    const { ok, data } = await updateReservationStatus(id, status)
    if (ok) {
      showToast(`✅ Status updated to "${STATUS_LABELS[status] ?? status}".`)
      load()
    } else {
      showToast(`❌ ${data.message || 'Failed.'}`)
    }
  }

  async function handleCancel(id) {
    const { ok, data } = await cancelReservation(id)
    if (ok) {
      showToast('🗑️ Reservation cancelled.')
      load()
    } else {
      showToast(`❌ ${data.message || 'Failed.'}`)
    }
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function fmtDate(isoStr) {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  function fmtTime(isoStr) {
    if (!isoStr) return ''
    // Backend stores times as ISO with Z suffix; slice HH:MM directly to
    // avoid timezone offsets on the client.
    return (isoStr || '').slice(11, 16)
  }

  const filtered = filter === 'All' ? reservations : reservations.filter(r => r.status === filter)

  const counts = STATUS_FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = reservations.filter(r => r.status === s).length
    return acc
  }, {})

  if (!user) return null

  return (
    <div className="min-h-screen bg-page-gradient">
      <Header title="All Reservations" leftContent={<BackButton onClick={() => navigate('/halls')} />} />

      <div className="max-w-[860px] mx-auto px-4 mt-10 mb-10">

        {/* Tab switcher */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm border border-[#e4daf0] dark:border-gray-700 w-fit mb-6">
          {[{ key: 'reservations', label: '📋 Reservations' }, { key: 'waitlist', label: '🔔 Waiting List' }].map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all
                ${tab === t.key ? 'text-white shadow-sm' : 'text-h-muted dark:text-gray-400 hover:text-h-text dark:hover:text-gray-200'}`}
              style={tab === t.key ? { background: 'linear-gradient(135deg, #26265c, #a05d97)' } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          {[
            { label: 'Active',      color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', value: counts.active ?? 0 },
            { label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',             value: counts.inProgress ?? 0 },
            { label: 'Done',        color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',       value: counts.done ?? 0 },
            { label: 'Revenue',     color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800', value: summary ? `${(summary.total_revenue ?? 0).toFixed(0)} BGN` : '—' },
          ].map(s => (
            <div key={s.label} className={`rounded-[12px] border px-4 py-3 text-center ${s.color}`}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Filter tabs — only shown on reservations tab */}
        {tab === 'reservations' && <div className="flex gap-2 mb-5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all duration-200
                ${filter === s
                  ? 'text-white border-transparent shadow-[0_4px_14px_rgba(160,93,151,.25)]'
                  : 'bg-white dark:bg-gray-800 text-h-primary dark:text-gray-200 border-transparent hover:border-h-accent hover:text-h-accent dark:hover:text-purple-300'
                }`}
              style={filter === s ? { background: 'linear-gradient(135deg, #26265c, #a05d97)' } : {}}
            >
              {s === 'All' ? 'All' : STATUS_LABELS[s]} {s !== 'All' && counts[s] !== undefined ? `(${counts[s]})` : ''}
            </button>
          ))}
        </div>}

        {tab === 'waitlist' ? (

          /* ── WAITING LIST TAB ── */
          waitlistLoading ? (
            <div className="flex justify-center py-24">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-9 h-9 border-4 border-h-mid border-t-transparent rounded-full" />
            </div>
          ) : waitlist.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-h-muted">
              <p className="text-4xl mb-3">🔔</p>
              <p className="text-lg font-medium">No waiting list entries.</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-3">
              {waitlist.map((w, i) => (
                <motion.div
                  key={w.id ?? i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white dark:bg-gray-800 rounded-[14px] shadow-card px-6 py-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    {(w.username ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-h-text dark:text-gray-200 text-[15px]">{w.username}</p>
                    <p className="text-h-muted dark:text-gray-400 text-[13px] truncate">🏛️ {w.hall?.name ?? '—'}</p>
                    <p className="text-h-muted dark:text-gray-400 text-[13px]">
                      📅 {fmtDate(w.start_date)}
                      {w.start_date && w.end_date && <span className="ml-2">– {fmtDate(w.end_date)}</span>}
                    </p>
                  </div>
                  <span className="text-[11px] text-h-muted dark:text-gray-400 flex-shrink-0">
                    {new Date(w.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </motion.div>
              ))}
            </div>
          )

        ) : loading ? (
          <div className="flex justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-9 h-9 border-4 border-h-mid border-t-transparent rounded-full"
            />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-h-muted">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-lg font-medium">No reservations found.</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((r, i) => (
              <motion.div
                key={r.id ?? i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-gray-800 rounded-[14px] shadow-card px-6 py-4 flex items-center gap-4"
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #26265c, #a05d97)' }}
                >
                  {(r.username ?? '?')[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-h-text dark:text-gray-200 text-[15px]">{r.username}</p>
                  </div>
                  <p className="text-h-muted dark:text-gray-400 text-[13px] truncate">🏛️ {r.hall?.name ?? r.hall}</p>
                  <p className="text-h-muted dark:text-gray-400 text-[13px]">
                    📅 {fmtDate(r.start_date)}
                    {r.start_date && r.end_date && (
                      <span className="ml-2">⏰ {fmtTime(r.start_date)} – {fmtTime(r.end_date)}</span>
                    )}
                  </p>
                  <p className="text-h-muted dark:text-gray-400 text-[12px] flex flex-wrap gap-x-3">
                    {r.event_type && <span>🎉 {r.event_type}</span>}
                    {r.guest_count > 0 && <span>👥 {r.guest_count} guests</span>}
                    {r.phone && <span>📞 {r.phone}</span>}
                  </p>
                </div>

                {/* Status + change */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                  <StatusBadge status={r.status} />
                  <select
                    value={r.status}
                    onChange={e => handleStatusChange(r.id, e.target.value)}
                    className="text-[11px] font-semibold rounded-lg px-2 py-1 border border-[#e4daf0] dark:border-gray-600 bg-white dark:bg-gray-700 text-h-text dark:text-gray-200 outline-none cursor-pointer hover:border-h-accent dark:hover:border-purple-400 transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="inProgress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  {(r.status === 'active' || r.status === 'inProgress') && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="px-3 py-1 rounded-lg text-[11px] font-semibold text-red-500 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-h-primary text-white text-sm font-semibold shadow-modal z-[200]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-lg transition-transform hover:scale-110"
      style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', backdropFilter: 'blur(6px)' }}
    >
      ←
    </button>
  )
}
