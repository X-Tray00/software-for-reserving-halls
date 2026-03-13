import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import HallCard, { cardVariants } from '../components/HallCard'
import DateModal from '../components/DateModal'
import AddHallModal from '../components/AddHallModal'
import EditHallModal from '../components/EditHallModal'
import { fetchHalls, deleteHall, createReservation, joinWaitlist } from '../api'
import { requireAuth, isAdmin } from '../auth'

const CATEGORIES = [
  { key: 'all',      label: 'All' },
  { key: 'wedding',  label: 'Wedding' },
  { key: 'sports',   label: 'Sports' },
  { key: 'congress', label: 'Congress' },
  { key: 'party',    label: 'Party' },
]

const SORT_OPTIONS = [
  { key: 'name',       label: 'Name A→Z' },
  { key: 'price_asc',  label: 'Price ↑' },
  { key: 'price_desc', label: 'Price ↓' },
  { key: 'cap_asc',    label: 'Capacity ↑' },
  { key: 'cap_desc',   label: 'Capacity ↓' },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

export default function HallsPage() {
  const user = requireAuth()
  const admin = isAdmin()
  const navigate = useNavigate()

  const [halls, setHalls] = useState([])
  const [filtered, setFiltered] = useState([])
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')
  const [loading, setLoading] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [waitlistOffer, setWaitlistOffer] = useState(null)

  const [dateModal, setDateModal] = useState({ open: false, hallId: null, hallName: '', hallCapacity: 0, hallCategory: '', hallCostPerDay: 0, hallReservations: [] })
  const [addOpen, setAddOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editHall, setEditHall] = useState(null)

  const [toast, setToast] = useState(null)

  useEffect(() => { if (user) load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchHalls()
      const normalized = (data || []).map(h => ({ ...h, id: parseInt(h.id) }))
      setHalls(normalized)
      applyFilterAndSort(normalized, category, search, sort)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function applyFilterAndSort(list, cat, q, s) {
    let result = cat === 'all' ? list : list.filter(h => h.category?.toLowerCase().includes(cat))
    if (q.trim()) {
      const lq = q.toLowerCase()
      result = result.filter(h => h.name?.toLowerCase().includes(lq) || h.location?.toLowerCase().includes(lq))
    }
    result = [...result].sort((a, b) => {
      if (s === 'price_asc')  return (a.cost_per_day ?? 0) - (b.cost_per_day ?? 0)
      if (s === 'price_desc') return (b.cost_per_day ?? 0) - (a.cost_per_day ?? 0)
      if (s === 'cap_asc')    return (a.capacity ?? 0) - (b.capacity ?? 0)
      if (s === 'cap_desc')   return (b.capacity ?? 0) - (a.capacity ?? 0)
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
    setFiltered(result)
  }

  function selectCategory(cat) {
    setCategory(cat)
    applyFilterAndSort(halls, cat, search, sort)
  }

  function handleSearch(q) {
    setSearch(q)
    setShowSuggestions(q.trim().length > 0)
    applyFilterAndSort(halls, category, q, sort)
  }

  function handleSort(s) {
    setSort(s)
    applyFilterAndSort(halls, category, search, s)
  }

  function openReserve(hallId) {
    const hall = halls.find(h => h.id === hallId)
    setDateModal({
      open: true, hallId,
      hallName: hall?.name ?? '',
      hallCapacity: hall?.capacity ?? 0,
      hallCategory: hall?.category ?? '',
      hallCostPerDay: hall?.cost_per_day ?? 0,
      hallReservations: hall?.reservations ?? [],
    })
  }

  async function confirmReservation(date, startH, startM, endH, endM, details) {
    const hall = halls.find(h => h.id === dateModal.hallId)
    const hallId = dateModal.hallId
    const hallName = dateModal.hallName
    setDateModal({ open: false, hallId: null, hallName: '', hallCapacity: 0, hallCategory: '', hallCostPerDay: 0, hallReservations: [] })
    if (!hall) { showToast('❌ Hall not found.', 'red'); return }
    const pad = n => String(n).padStart(2, '0')
    const startIso = `${date}T${pad(startH)}:${pad(startM)}:00Z`
    const endIso   = `${date}T${pad(endH)}:${pad(endM)}:00Z`
    try {
      const { ok, status, data } = await createReservation({
        first_name:  user.username,
        last_name:   '',
        phone:       details.phone,
        guest_count: details.guestCount,
        event_type:  details.eventType,
        notes:       details.notes,
        start_date:  startIso,
        end_date:    endIso,
        hall_id:     hall.id,
      })
      if (status === 409) {
        setWaitlistOffer({ hallId, hallName, startDate: startIso, endDate: endIso })
      } else {
        showToast(ok ? '✅ Reservation confirmed!' : `❌ ${data.message || 'Failed.'}`, ok ? 'green' : 'red')
      }
    } catch {
      showToast('❌ Network error.', 'red')
    }
  }

  async function handleJoinWaitlist() {
    const { hallId, hallName, startDate, endDate } = waitlistOffer
    setWaitlistOffer(null)
    try {
      const { ok, data } = await joinWaitlist(hallId, startDate, endDate)
      showToast(ok ? `🔔 Added to waitlist for "${hallName}".` : `❌ ${data.message || 'Failed.'}`, ok ? 'green' : 'red')
    } catch {
      showToast('❌ Network error.', 'red')
    }
  }

  async function handleDelete(hall) {
    if (!confirm(`Delete "${hall.name}"?`)) return
    try {
      const { ok, data } = await deleteHall(hall.id)
      if (ok) { showToast('🗑️ Hall deleted.', 'red'); load() }
      else showToast(`❌ ${data.message || 'Failed.'}`, 'red')
    } catch {
      showToast('❌ Network error.', 'red')
    }
  }

  function handleEditClick(hall) {
    setEditHall(hall)
  }

  function showToast(msg, color) {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 3500)
  }

  function cancelMode() {
    setDeleteMode(false)
    setEditMode(false)
  }

  const activeMode = deleteMode ? 'delete' : editMode ? 'edit' : null

  const suggestions = search.trim().length > 0
    ? halls.filter(h => {
        const lq = search.toLowerCase()
        return h.name?.toLowerCase().includes(lq) || h.location?.toLowerCase().includes(lq)
      }).slice(0, 5)
    : []

  if (!user) return null

  return (
    <div className="min-h-screen bg-page-gradient">
      <Header
        leftContent={admin && (
          <AdminControls
            activeMode={activeMode}
            onAdd={() => setAddOpen(true)}
            onDelete={() => { setEditMode(false); setDeleteMode(true) }}
            onEdit={() => { setDeleteMode(false); setEditMode(true) }}
            onCancel={cancelMode}
          />
        )}
      />

      {/* Mode banner */}
      <AnimatePresence>
        {activeMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`text-center py-2 text-sm font-semibold text-white ${activeMode === 'delete' ? 'bg-red-500' : 'bg-h-accent'}`}
          >
            {activeMode === 'delete'
              ? '🗑️ Delete mode — click a hall to delete it'
              : '✏️ Edit mode — click a hall to edit it'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + Sort bar */}
      <div className="flex flex-wrap justify-center gap-3 px-5 pt-6 pb-1">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => search.trim() && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            placeholder="Search halls by name or location…"
            className="px-4 py-2 rounded-full text-sm border-2 border-transparent bg-white dark:bg-gray-800 text-h-text dark:text-gray-200 shadow-sm outline-none focus:border-h-accent dark:focus:border-purple-400 transition-colors w-64"
          />
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-modal border border-[#e4daf0] dark:border-gray-700 overflow-hidden z-50"
              >
                {suggestions.map(h => (
                  <button
                    key={h.id}
                    onMouseDown={() => { setShowSuggestions(false); navigate(`/halls/${h.id}`) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors border-b border-[#f0eefa] dark:border-gray-700 last:border-0"
                  >
                    <p className="text-sm font-semibold text-h-text dark:text-gray-200 truncate">{h.name}</p>
                    <p className="text-xs text-h-muted dark:text-gray-400 truncate">{h.location}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <select
          value={sort}
          onChange={e => handleSort(e.target.value)}
          className="px-4 py-2 rounded-full text-sm font-semibold bg-white dark:bg-gray-800 text-h-primary dark:text-gray-200 border-2 border-transparent shadow-sm outline-none cursor-pointer focus:border-h-accent dark:focus:border-purple-400 transition-colors"
        >
          {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap justify-center gap-2.5 px-5 pt-4 pb-4">
        {CATEGORIES.map(cat => (
          <motion.button
            key={cat.key}
            onClick={() => selectCategory(cat.key)}
            whileTap={{ scale: 0.93 }}
            className={`px-5 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-200 shadow-sm
              ${category === cat.key
                ? 'text-white border-transparent shadow-[0_4px_16px_rgba(160,93,151,.30)]'
                : 'bg-white dark:bg-gray-800 text-h-primary dark:text-gray-200 border-transparent hover:border-h-accent hover:text-h-accent dark:hover:text-purple-300 hover:shadow-[0_4px_14px_rgba(160,93,151,.18)]'
              }`}
            style={category === cat.key ? { background: 'linear-gradient(135deg, #26265c, #a05d97)' } : {}}
          >
            {cat.label}
          </motion.button>
        ))}
      </div>

      {/* Hall grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-10 h-10 border-4 border-h-mid border-t-transparent rounded-full"
          />
        </div>
      ) : (
        <motion.div
          key={category}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 px-8 pb-12 max-w-[1280px] mx-auto pt-2"
        >
          {filtered.map(hall => (
            <HallCard
              key={hall.id}
              hall={hall}
              deleteMode={deleteMode}
              editMode={editMode}
              onReserve={openReserve}
              onDelete={handleDelete}
              onEdit={handleEditClick}
            />
          ))}
          {filtered.length === 0 && (
            <motion.p variants={cardVariants} className="col-span-full text-center text-h-muted py-16 text-lg">
              No halls found in this category.
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Modals */}
      <DateModal
        open={dateModal.open}
        hallName={dateModal.hallName}
        hallCapacity={dateModal.hallCapacity}
        hallCategory={dateModal.hallCategory}
        hallCostPerDay={dateModal.hallCostPerDay}
        hallReservations={dateModal.hallReservations}
        onConfirm={confirmReservation}
        onClose={() => setDateModal({ open: false, hallId: null, hallName: '', hallCapacity: 0, hallCategory: '', hallCostPerDay: 0, hallReservations: [] })}
      />
      <AddHallModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} />
      <EditHallModal
        hall={editHall}
        onClose={() => setEditHall(null)}
        onUpdated={() => { showToast('✅ Hall updated!', 'green'); load() }}
      />

      {/* Waitlist offer banner */}
      <AnimatePresence>
        {waitlistOffer && (
          <motion.div
            key="waitlist-offer"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[210] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white dark:bg-gray-800 shadow-modal border border-[#e4daf0] dark:border-gray-700 max-w-[90vw]"
          >
            <span className="text-sm text-h-text dark:text-gray-200 font-medium">
              🏛️ <strong>{waitlistOffer.hallName}</strong> is already booked.
            </span>
            <button
              onClick={handleJoinWaitlist}
              className="px-4 py-1.5 rounded-full text-white text-sm font-semibold shadow-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #26265c, #a05d97)' }}
            >
              🔔 Join Waitlist
            </button>
            <button
              onClick={() => setWaitlistOffer(null)}
              className="text-h-muted dark:text-gray-400 hover:text-h-text dark:hover:text-gray-200 text-lg leading-none flex-shrink-0"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white text-sm font-semibold shadow-modal z-[200]
              ${toast.color === 'green' ? 'bg-green-600' : 'bg-red-500'}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AdminControls({ activeMode, onAdd, onDelete, onEdit, onCancel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (activeMode) {
    return (
      <motion.button
        initial={{ scale: 0.8 }} animate={{ scale: 1 }}
        onClick={onCancel}
        className={`px-4 py-1.5 rounded-full text-white text-sm font-semibold transition-colors
          ${activeMode === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-h-accent hover:bg-h-accent-dark'}`}
      >
        ✕ Cancel {activeMode === 'delete' ? 'Delete' : 'Edit'}
      </motion.button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-9 h-9 rounded-full text-white text-xl flex items-center justify-center transition-colors"
        style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', backdropFilter: 'blur(6px)' }}
      >
        ⚙
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-modal overflow-hidden z-50"
          >
            <AdminBtn onClick={() => { setOpen(false); onAdd() }}>➕ Add Hall</AdminBtn>
            <AdminBtn onClick={() => { setOpen(false); onEdit() }}>✏️ Edit Hall</AdminBtn>
            <AdminBtn onClick={() => { setOpen(false); onDelete() }} danger>🗑️ Delete Hall</AdminBtn>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AdminBtn({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors
        ${danger ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-h-text dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-gray-700 hover:text-h-accent'}`}
    >
      {children}
    </button>
  )
}
