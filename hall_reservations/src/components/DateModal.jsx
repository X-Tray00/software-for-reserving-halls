import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const DAYS   = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const HOURS   = Array.from({ length: 17 }, (_, i) => i + 7) // 7–23
const MINUTES = [0, 15, 30, 45]

const EVENT_TYPES = ['Wedding', 'Birthday', 'Corporate', 'Conference', 'Concert', 'Sports Event', 'Exhibition', 'Other']

function categoryToEventType(category) {
  if (!category) return ''
  const c = category.toLowerCase()
  if (c.includes('тържеств') || c.includes('wedding'))          return 'Wedding'
  if (c.includes('обред'))                                       return 'Wedding'
  if (c.includes('луксоз'))                                      return 'Corporate'
  if (c.includes('конгрес') || c.includes('конферен') ||
      c.includes('congress'))                                    return 'Conference'
  if (c.includes('спорт') || c.includes('sport'))               return 'Sports Event'
  if (c.includes('парти') || c.includes('party'))               return 'Birthday'
  return ''
}

function startOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function fmt(h, m = 0) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function DateModal({ open, hallName, hallCapacity, hallCategory, hallCostPerDay = 0, hallReservations = [], onConfirm, onClose }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [step,     setStep]     = useState(1)
  const [view,     setView]     = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState(null)
  const [startH,   setStartH]   = useState(10)
  const [startM,   setStartM]   = useState(0)
  const [endH,     setEndH]     = useState(11)
  const [endM,     setEndM]     = useState(0)

  // Step 2 fields
  const [phone,      setPhone]      = useState('')
  const [guests,     setGuests]     = useState('')
  const [eventType,  setEventType]  = useState('')
  const [notes,      setNotes]      = useState('')

  const [error, setError] = useState('')

  // Pre-select event type based on hall category whenever modal opens
  useEffect(() => {
    if (open) setEventType(categoryToEventType(hallCategory))
  }, [open, hallCategory])

  const now = new Date()
  const isSelectedToday = selected && selected.getTime() === today.getTime()

  function isStartPast(h, m) {
    if (!isSelectedToday) return false
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes()
  }
  function isHourAllPast(h) { return isStartPast(h, 45) }

  function firstValidSlot() {
    const nowTotal = now.getHours() * 60 + now.getMinutes()
    for (const h of HOURS.filter(h => h <= 22)) {
      for (const m of MINUTES) {
        if (h * 60 + m > nowTotal) return { h, m }
      }
    }
    return { h: 22, m: 45 }
  }

  function isDateBooked(day) {
    const dStr = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return hallReservations.some(r => {
      const start = (r.start_date ?? '').slice(0, 10)
      return start === dStr
    })
  }

  // Price estimation: same-day booking = 1 day minimum (matches backend logic)
  const durationHours = (endH + endM / 60) - (startH + startM / 60)
  const estimatedDays = Math.max(1, Math.ceil(durationHours / 24))
  const estimatedCost = estimatedDays > 7
    ? hallCostPerDay * estimatedDays * 0.9
    : hallCostPerDay * estimatedDays

  function prevMonth() {
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  }
  function nextMonth() {
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })
  }

  function handleDay(day) {
    const d = new Date(view.year, view.month, day)
    if (d < today) return
    setSelected(d)
    setError('')
    if (d.getTime() === today.getTime()) {
      const { h, m } = firstValidSlot()
      setStartH(h); setStartM(m)
      const endTotal = h * 60 + m + 60
      setEndH(Math.min(Math.floor(endTotal / 60), 23))
      setEndM(endTotal % 60)
    }
  }

  function handleStartH(h) {
    if (isHourAllPast(h)) return
    let m = startM
    if (isSelectedToday) {
      const nowTotal = now.getHours() * 60 + now.getMinutes()
      if (!MINUTES.some(min => h * 60 + min > nowTotal)) return
      const firstM = MINUTES.find(min => h * 60 + min > nowTotal)
      if (firstM !== undefined && isStartPast(h, m)) m = firstM
    }
    setStartH(h); setStartM(m)
    const startTotal = h * 60 + m
    if (endH * 60 + endM <= startTotal) {
      const newEnd = startTotal + 60
      setEndH(Math.min(Math.floor(newEnd / 60), 23))
      setEndM(newEnd % 60)
    }
  }

  function handleStartM(m) {
    if (isStartPast(startH, m)) return
    setStartM(m)
    const startTotal = startH * 60 + m
    if (endH * 60 + endM <= startTotal) {
      const newEnd = startTotal + 60
      setEndH(Math.min(Math.floor(newEnd / 60), 23))
      setEndM(newEnd % 60)
    }
  }

  function handleEndH(h) {
    const startTotal = startH * 60 + startM
    if (h * 60 + endM <= startTotal) {
      const firstM = MINUTES.find(min => h * 60 + min > startTotal)
      if (firstM === undefined) return
      setEndM(firstM)
    }
    setEndH(h)
  }

  function handleEndM(m) {
    if (endH * 60 + m <= startH * 60 + startM) return
    setEndM(m)
  }

  function handleNextStep() {
    if (!selected) { setError('Please select a date.'); return }
    if (startH * 60 + startM >= endH * 60 + endM) { setError('End time must be after start time.'); return }
    setError('')
    setStep(2)
  }

  function handleConfirm() {
    if (!phone.trim()) { setError('Phone number is required.'); return }
    const g = parseInt(guests)
    if (!g || g < 1) { setError('Enter the number of guests.'); return }
    if (hallCapacity && g > hallCapacity) { setError(`Exceeds hall capacity (${hallCapacity} guests).`); return }
    if (!eventType) { setError('Please select an event type.'); return }
    setError('')
    const iso = `${selected.getFullYear()}-${String(selected.getMonth()+1).padStart(2,'0')}-${String(selected.getDate()).padStart(2,'0')}`
    onConfirm(iso, startH, startM, endH, endM, { phone: phone.trim(), guestCount: g, eventType, notes: notes.trim() })
  }

  function handleClose() {
    setStep(1); setSelected(null); setError('')
    setPhone(''); setGuests(''); setEventType(categoryToEventType(hallCategory)); setNotes('')
    onClose()
  }

  const offset = startOfMonth(view.year, view.month)
  const total  = daysInMonth(view.year, view.month)
  const cells  = Array.from({ length: offset + total }, (_, i) => i < offset ? null : i - offset + 1)
  while (cells.length % 7 !== 0) cells.push(null)

  function TimeBtn({ active, disabled, onClick, children }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`py-1 rounded-md text-xs font-semibold transition-all duration-150
          ${active
            ? 'text-white shadow-sm'
            : disabled
              ? 'text-[#ccc] dark:text-gray-600 cursor-not-allowed bg-[#fafafa] dark:bg-gray-700'
              : 'text-h-text dark:text-gray-200 hover:bg-[#f0eefa] dark:hover:bg-gray-700 hover:text-h-accent bg-[#fafafa] dark:bg-gray-700/50'
          }`}
        style={active ? { background: 'linear-gradient(135deg, #26265c, #a05d97)' } : {}}
      >
        {children}
      </button>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-[20px] shadow-modal p-7 text-center"
          >
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                      ${step === s ? 'text-white' : step > s ? 'text-white opacity-60' : 'bg-[#f0eefa] dark:bg-gray-700 text-h-muted dark:text-gray-400'}`}
                    style={step >= s ? { background: 'linear-gradient(135deg, #26265c, #a05d97)' } : {}}
                  >
                    {s}
                  </div>
                  {s < 2 && <div className={`w-8 h-0.5 rounded transition-all duration-300 ${step > 1 ? 'bg-h-accent' : 'bg-[#e4daf0] dark:bg-gray-600'}`} />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-h-primary dark:text-blue-200 font-bold text-xl mb-1">Date & Time</h3>
                  {hallName && <p className="text-h-muted dark:text-gray-400 text-sm mb-5">{hallName}</p>}

                  {/* Month nav */}
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={prevMonth} className="w-8 h-8 rounded-full flex items-center justify-center text-h-primary dark:text-gray-300 hover:bg-[#f0eefa] dark:hover:bg-gray-700 transition-colors text-lg font-bold">‹</button>
                    <span className="font-semibold text-h-primary dark:text-gray-200 text-[15px]">{MONTHS[view.month]} {view.year}</span>
                    <button onClick={nextMonth} className="w-8 h-8 rounded-full flex items-center justify-center text-h-primary dark:text-gray-300 hover:bg-[#f0eefa] dark:hover:bg-gray-700 transition-colors text-lg font-bold">›</button>
                  </div>

                  <div className="grid grid-cols-7 mb-1">
                    {DAYS.map(d => <div key={d} className="text-[11px] font-semibold text-h-muted dark:text-gray-400 uppercase py-1">{d}</div>)}
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 mb-4">
                    {cells.map((day, i) => {
                      if (!day) return <div key={i} />
                      const cellDate = new Date(view.year, view.month, day)
                      const isPast   = cellDate < today
                      const isToday  = cellDate.getTime() === today.getTime()
                      const isSel    = selected && cellDate.getTime() === selected.getTime()
                      const isBooked = !isPast && !isSel && isDateBooked(day)
                      return (
                        <button
                          key={i}
                          onClick={() => handleDay(day)}
                          disabled={isPast}
                          className={`mx-auto w-9 h-9 rounded-full text-sm font-medium transition-all duration-150
                            ${isSel    ? 'text-white shadow-[0_4px_14px_rgba(160,93,151,.4)]'
                              : isBooked ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-900/60'
                              : isToday  ? 'text-h-accent dark:text-purple-300 font-bold border-2 border-h-accent dark:border-purple-400 hover:bg-[#f0eefa] dark:hover:bg-gray-700'
                              : isPast   ? 'text-[#ccc] dark:text-gray-600 cursor-not-allowed'
                              : 'text-h-text dark:text-gray-200 hover:bg-[#f0eefa] dark:hover:bg-gray-700 hover:text-h-accent cursor-pointer'
                            }`}
                          style={isSel ? { background: 'linear-gradient(135deg, #26265c, #a05d97)' } : {}}
                          title={isBooked ? 'This date already has a booking' : undefined}
                        >
                          {day}
                          {isBooked && <span className="block w-1 h-1 rounded-full bg-orange-400 mx-auto -mt-1" />}
                        </button>
                      )
                    })}
                  </div>

                  <div className="border-t border-[#f0eefa] dark:border-gray-600 mb-4" />

                  <div className="grid grid-cols-2 gap-4 text-left mb-2">
                    <div>
                      <p className="text-[11px] font-semibold text-h-muted dark:text-gray-400 uppercase tracking-wide mb-2">Start time</p>
                      <div className="grid grid-cols-4 gap-1 mb-1">
                        {HOURS.filter(h => h <= 22).map(h => (
                          <TimeBtn key={h} active={startH === h} disabled={isHourAllPast(h)} onClick={() => handleStartH(h)}>
                            {String(h).padStart(2,'0')}
                          </TimeBtn>
                        ))}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <span className="text-[10px] text-h-muted dark:text-gray-500 self-center mr-1">min</span>
                        {MINUTES.map(m => (
                          <TimeBtn key={m} active={startM === m} disabled={isStartPast(startH, m)} onClick={() => handleStartM(m)}>
                            :{String(m).padStart(2,'0')}
                          </TimeBtn>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-h-muted dark:text-gray-400 uppercase tracking-wide mb-2">End time</p>
                      <div className="grid grid-cols-4 gap-1 mb-1">
                        {HOURS.filter(h => h >= 8).map(h => (
                          <TimeBtn key={h} active={endH === h} disabled={h * 60 + 45 <= startH * 60 + startM} onClick={() => handleEndH(h)}>
                            {String(h).padStart(2,'0')}
                          </TimeBtn>
                        ))}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <span className="text-[10px] text-h-muted dark:text-gray-500 self-center mr-1">min</span>
                        {MINUTES.map(m => (
                          <TimeBtn key={m} active={endM === m} disabled={endH * 60 + m <= startH * 60 + startM} onClick={() => handleEndM(m)}>
                            :{String(m).padStart(2,'0')}
                          </TimeBtn>
                        ))}
                      </div>
                    </div>
                  </div>

                  {selected && (
                    <div className="mt-3 py-2 px-3 rounded-lg bg-[#f7f5ff] dark:bg-gray-700 text-h-accent dark:text-purple-300 text-sm font-medium text-left">
                      📅 {selected.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                      &nbsp;·&nbsp;⏰ {fmt(startH, startM)} – {fmt(endH, endM)}
                    </div>
                  )}

                  {error && <p className="text-red-500 text-xs mt-2 text-left">{error}</p>}

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={handleNextStep}
                      className="flex-1 py-2.5 rounded-lg text-white font-semibold text-sm bg-btn-gradient hover:opacity-90 transition-opacity"
                    >
                      Next →
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-[#f0eefa] dark:bg-gray-600 text-h-accent-dark dark:text-gray-200 hover:bg-[#e4daf0] dark:hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-h-primary dark:text-blue-200 font-bold text-xl mb-1">Event Details</h3>
                  {hallName && <p className="text-h-muted dark:text-gray-400 text-sm mb-1">{hallName}</p>}
                  <p className="text-h-accent dark:text-purple-300 text-xs font-medium mb-5">
                    📅 {selected?.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    &nbsp;·&nbsp;⏰ {fmt(startH, startM)} – {fmt(endH, endM)}
                  </p>

                  {hallCostPerDay > 0 && (
                    <div className="mb-4 py-2.5 px-3.5 rounded-xl bg-[#f7f5ff] dark:bg-gray-700 text-left">
                      <p className="text-h-accent dark:text-purple-300 text-[13px] font-semibold">
                        💰 Estimated: {estimatedCost.toFixed(2)} BGN
                      </p>
                      <p className="text-h-muted dark:text-gray-400 text-[11px] mt-0.5">
                        {estimatedDays} day{estimatedDays > 1 ? 's' : ''} × {hallCostPerDay.toFixed(2)} BGN/day
                        {estimatedDays > 7 ? ' (10% discount applied)' : ''}
                      </p>
                    </div>
                  )}

                  <div className="text-left space-y-4">
                    {/* Phone */}
                    <div>
                      <label className="text-[11px] font-semibold text-h-muted dark:text-gray-400 uppercase tracking-wide block mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+359 88 123 4567"
                        className="w-full px-3 py-2 rounded-lg border border-[#e4daf0] dark:border-gray-600 bg-white dark:bg-gray-700 text-h-text dark:text-gray-200 text-sm outline-none focus:border-h-accent dark:focus:border-purple-400 transition-colors"
                      />
                    </div>

                    {/* Guests */}
                    <div>
                      <label className="text-[11px] font-semibold text-h-muted dark:text-gray-400 uppercase tracking-wide block mb-1">
                        Number of guests *{hallCapacity ? ` (max ${hallCapacity})` : ''}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={hallCapacity || undefined}
                        value={guests}
                        onChange={e => setGuests(e.target.value)}
                        placeholder="e.g. 80"
                        className="w-full px-3 py-2 rounded-lg border border-[#e4daf0] dark:border-gray-600 bg-white dark:bg-gray-700 text-h-text dark:text-gray-200 text-sm outline-none focus:border-h-accent dark:focus:border-purple-400 transition-colors"
                      />
                    </div>

                    {/* Event type */}
                    <div>
                      <label className="text-[11px] font-semibold text-h-muted dark:text-gray-400 uppercase tracking-wide block mb-2">
                        Event type *
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {EVENT_TYPES.map(t => (
                          <button
                            key={t}
                            onClick={() => setEventType(t)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all duration-150
                              ${eventType === t
                                ? 'text-white border-transparent'
                                : 'bg-[#fafafa] dark:bg-gray-700 text-h-text dark:text-gray-200 border-[#e4daf0] dark:border-gray-600 hover:border-h-accent hover:text-h-accent dark:hover:text-purple-300'
                              }`}
                            style={eventType === t ? { background: 'linear-gradient(135deg, #26265c, #a05d97)' } : {}}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-[11px] font-semibold text-h-muted dark:text-gray-400 uppercase tracking-wide block mb-1">
                        Notes (optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Special requirements, equipment, catering..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-[#e4daf0] dark:border-gray-600 bg-white dark:bg-gray-700 text-h-text dark:text-gray-200 text-sm outline-none focus:border-h-accent dark:focus:border-purple-400 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => { setStep(1); setError('') }}
                      className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-[#f0eefa] dark:bg-gray-600 text-h-accent-dark dark:text-gray-200 hover:bg-[#e4daf0] dark:hover:bg-gray-500 transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-1 py-2.5 rounded-lg text-white font-semibold text-sm bg-btn-gradient hover:opacity-90 transition-opacity"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
