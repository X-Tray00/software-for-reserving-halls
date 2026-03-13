import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import StatusBadge from '../components/StatusBadge'
import { fetchUserReservations, cancelReservation } from '../api'
import { requireAuth } from '../auth'

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function daysInMonth(y, m)  { return new Date(y, m + 1, 0).getDate() }
function firstDow(y, m)     { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }
function pad2(n)             { return String(n).padStart(2, '0') }

function statusDot(status) {
  if (status === 'active')     return 'bg-yellow-400'
  if (status === 'inProgress') return 'bg-blue-400'
  return 'bg-green-400'
}

export default function HistoryPage() {
  const user = requireAuth()
  const navigate = useNavigate()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading]           = useState(true)
  const [toast, setToast]               = useState(null)
  const [view, setView]                 = useState('list') // 'list' | 'calendar'
  const [calDate, setCalDate]           = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => { if (user) load() }, [])

  function load() {
    setLoading(true)
    fetchUserReservations()
      .then(data => setReservations(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this reservation?')) return
    const { ok, data } = await cancelReservation(id)
    if (ok) { showToast('🗑️ Reservation cancelled.'); load() }
    else     showToast(`❌ ${data.message || 'Failed.'}`)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function fmtDate(isoStr) {
    if (!isoStr) return ''
    return new Date(isoStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  function fmtTime(isoStr) {
    if (!isoStr) return ''
    // Times are stored as ISO strings like 2026-03-12T12:00:00Z – use the
    // raw HH:MM portion to avoid timezone shifts.
    return (isoStr || '').slice(11, 16)
  }

  function resvForDay(y, m, d) {
    const dateStr = `${y}-${pad2(m + 1)}-${pad2(d)}`
    return reservations.filter(r => {
      const start = (r.start_date ?? '').slice(0, 10)
      const end   = (r.end_date   ?? '').slice(0, 10)
      return start <= dateStr && dateStr <= end
    })
  }

  function prevMonth() {
    setSelectedDay(null)
    setCalDate(d => d.month === 0 ? { year: d.year - 1, month: 11 } : { year: d.year, month: d.month - 1 })
  }
  function nextMonth() {
    setSelectedDay(null)
    setCalDate(d => d.month === 11 ? { year: d.year + 1, month: 0 } : { year: d.year, month: d.month + 1 })
  }

  const selectedDayResv = selectedDay ? resvForDay(calDate.year, calDate.month, selectedDay) : []

  if (!user) return null

  return (
    <div className="min-h-screen bg-page-gradient">
      <Header title="My Reservations" leftContent={<BackButton onClick={() => navigate('/halls')} />} />

      <div className="max-w-[760px] mx-auto px-4 mt-10 mb-10">

        {/* Title + view toggle */}
        <div className="flex items-center justify-between mb-6">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-h-primary dark:text-blue-200 font-bold text-xl"
          >
            Reservation History
          </motion.h2>
          <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm border border-[#e4daf0] dark:border-gray-600">
            {[{ key: 'list', label: '☰ List' }, { key: 'calendar', label: '📅 Calendar' }].map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all
                  ${view === v.key ? 'text-white shadow-sm' : 'text-h-muted dark:text-gray-400 hover:text-h-text dark:hover:text-gray-200'}`}
                style={view === v.key ? { background: 'linear-gradient(135deg, #26265c, #a05d97)' } : {}}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-9 h-9 border-4 border-h-mid border-t-transparent rounded-full"
            />
          </div>
        ) : view === 'list' ? (

          /* ── LIST VIEW ── */
          reservations.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 text-h-muted">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-lg font-medium">No reservations yet.</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-3">
              {reservations.map((r, i) => (
                <motion.div
                  key={r.id ?? i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-[14px] shadow-card px-6 py-4 flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg"
                    style={{ background: 'linear-gradient(135deg, #f0eefa, #e4daf0)' }}
                  >
                    🏛️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-h-text dark:text-gray-200 text-[15px] truncate">{r.hall?.name ?? r.hall}</p>
                    <p className="text-h-muted dark:text-gray-400 text-[13px] mt-0.5">
                      📅 {fmtDate(r.start_date)}
                      {r.start_date && r.end_date && (
                        <span className="ml-2">⏰ {fmtTime(r.start_date)} – {fmtTime(r.end_date)}</span>
                      )}
                    </p>
                    <p className="text-h-muted dark:text-gray-400 text-[12px] mt-0.5 flex flex-wrap gap-x-3">
                      {r.event_type && <span>🎉 {r.event_type}</span>}
                      {r.guest_count > 0 && <span>👥 {r.guest_count} guests</span>}
                      {r.phone && <span>📞 {r.phone}</span>}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                  {r.status === 'active' && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="ml-2 flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )

        ) : (

          /* ── CALENDAR VIEW ── */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-[18px] shadow-card px-6 py-5">

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="w-8 h-8 rounded-full flex items-center justify-center text-h-primary dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors font-bold"
              >
                ‹
              </button>
              <span className="font-semibold text-h-primary dark:text-gray-200 text-[15px]">
                {new Date(calDate.year, calDate.month).toLocaleString('en', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-full flex items-center justify-center text-h-primary dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors font-bold"
              >
                ›
              </button>
            </div>

            {/* Day-of-week header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DOW.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-h-muted dark:text-gray-500 py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow(calDate.year, calDate.month) }).map((_, i) => (
                <div key={`e${i}`} />
              ))}
              {Array.from({ length: daysInMonth(calDate.year, calDate.month) }, (_, i) => i + 1).map(day => {
                const dayResv = resvForDay(calDate.year, calDate.month, day)
                const hasResv = dayResv.length > 0
                const today   = new Date()
                const isToday = today.getFullYear() === calDate.year && today.getMonth() === calDate.month && today.getDate() === day
                const isSel   = selectedDay === day && hasResv
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(hasResv ? (selectedDay === day ? null : day) : null)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-start pt-1 text-xs font-medium transition-colors
                      ${hasResv ? 'cursor-pointer' : 'cursor-default'}
                      ${isSel   ? 'bg-[#ede9fa] dark:bg-purple-900/40 ring-2 ring-h-accent'
                                : hasResv ? 'bg-purple-50 dark:bg-gray-700 hover:bg-[#ede9fa] dark:hover:bg-gray-600'
                                          : 'bg-transparent'}
                      ${isToday && !isSel ? 'ring-2 ring-h-accent/50' : ''}`}
                  >
                    <span className={isToday ? 'text-h-accent font-bold' : 'text-h-text dark:text-gray-200'}>{day}</span>
                    <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                      {dayResv.slice(0, 3).map((r, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${statusDot(r.status)}`} />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 justify-center text-[11px] text-h-muted dark:text-gray-400">
              {[['bg-yellow-400', 'Active'], ['bg-blue-400', 'In Progress'], ['bg-green-400', 'Done']].map(([cls, lbl]) => (
                <span key={lbl} className="flex items-center gap-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />{lbl}
                </span>
              ))}
            </div>

            {/* Selected day details */}
            <AnimatePresence>
              {selectedDay && selectedDayResv.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-[#e4daf0] dark:border-gray-700 flex flex-col gap-2">
                    <p className="text-[12px] font-semibold text-h-muted dark:text-gray-400 uppercase tracking-wide">
                      {new Date(calDate.year, calDate.month, selectedDay).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {selectedDayResv.map(r => (
                      <div key={r.id} className="flex items-center gap-3 bg-[#f7f5ff] dark:bg-gray-700 rounded-xl px-4 py-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot(r.status)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-h-text dark:text-gray-200 text-[13px] truncate">{r.hall?.name ?? '—'}</p>
                          <p className="text-h-muted dark:text-gray-400 text-[11px]">
                            {fmtTime(r.start_date)} – {fmtTime(r.end_date)}
                            {r.event_type && ` · ${r.event_type}`}
                          </p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
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
