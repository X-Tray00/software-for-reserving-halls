import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Lightbox from '../components/Lightbox'
import DateModal from '../components/DateModal'
import { fetchHall, createReservation, joinWaitlist, imageUrl } from '../api'
import { requireAuth, getUser } from '../auth'

export default function HallGalleryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = requireAuth()

  const [hall, setHall] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const [dateModal, setDateModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [waitlistOffer, setWaitlistOffer] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchHall(id)
      .then(data => setHall(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  async function confirmReservation(date, startH, startM, endH, endM, details) {
    setDateModal(false)
    try {
      const pad = n => String(n).padStart(2, '0')
      const startIso = `${date}T${pad(startH)}:${pad(startM)}:00Z`
      const endIso   = `${date}T${pad(endH)}:${pad(endM)}:00Z`
      const { ok, status, data } = await createReservation({
        first_name:  user.username,
        last_name:   '',
        phone:       details.phone,
        guest_count: details.guestCount,
        event_type:  details.eventType,
        notes:       details.notes,
        start_date:  startIso,
        end_date:    endIso,
        hall_id:     parseInt(id),
      })
      if (status === 409) {
        setWaitlistOffer({ hallId: parseInt(id), hallName: hall?.name ?? '', startDate: startIso, endDate: endIso })
      } else {
        showToast(ok ? '✅ Reservation confirmed!' : `❌ ${data.message || 'Failed.'}`, ok)
      }
    } catch {
      showToast('❌ Network error.', false)
    }
  }

  async function handleJoinWaitlist() {
    const { hallId, hallName, startDate, endDate } = waitlistOffer
    setWaitlistOffer(null)
    try {
      const { ok, data } = await joinWaitlist(hallId, startDate, endDate)
      showToast(ok ? `🔔 Added to waitlist for "${hallName}".` : `❌ ${data.message || 'Failed.'}`, ok)
    } catch {
      showToast('❌ Network error.', false)
    }
  }

  function showToast(msg, success) {
    setToast({ msg, success })
    setTimeout(() => setToast(null), 3500)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-page-gradient pb-12">
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-10 h-10 border-4 border-h-mid border-t-transparent rounded-full"
          />
        </div>
      ) : hall ? (
        <>
          {/* Map */}
          <div className="w-full h-[300px]">
            <iframe
              title="map"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(hall.location)}&output=embed`}
              className="w-full h-full border-0 block"
              allowFullScreen
            />
          </div>

          {/* Back button */}
          <div className="px-7 mt-4">
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => navigate('/halls')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-900 dark:text-gray-100 text-lg font-semibold shadow-[0_2px_12px_rgba(26,26,70,.20)] bg-white/90 dark:bg-gray-800/90 transition-all duration-200 hover:scale-110 hover:shadow-[0_0_18px_rgba(160,93,151,.75)] hover:bg-gradient-to-br hover:from-[#26265c] hover:to-[#a05d97] hover:text-white"
              style={{ backdropFilter: 'blur(10px)' }}
            >
              ←
            </motion.button>
          </div>

          {/* Hall info */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="flex items-start gap-7 max-w-[1000px] mx-auto mt-7 mb-6 px-7 py-7 bg-white dark:bg-gray-800 rounded-[18px] shadow-card"
          >
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              src={hall.images?.[0] ? imageUrl(hall.images[0]) : '/pics/test_hall.jpg'}
              alt={hall.name}
              className="w-[42%] aspect-[4/3] object-cover rounded-xl flex-shrink-0"
            />

            <div className="flex-1">
              <h2 className="text-h-primary dark:text-blue-200 font-bold text-2xl mb-3">{hall.name}</h2>
              <InfoRow label="Location" value={hall.location} />
              <InfoRow label="Capacity" value={`${hall.capacity} people`} />
              <InfoRow label="Price" value={`${hall.cost_per_day} BGN / day`} />
              <InfoRow label="Category" value={hall.category} />
              <InfoRow label="Contact" value={hall.contact ?? 'Unavailable'} />

              <motion.button
                whileHover={{ y: -2, opacity: 0.92 }}
                whileTap={{ y: 0, scale: 0.98 }}
                onClick={() => setDateModal(true)}
                className="mt-5 w-full py-3 rounded-xl text-white font-semibold text-sm bg-green-gradient shadow-sm transition-all"
              >
                Reserve This Hall
              </motion.button>
            </div>
          </motion.div>

          {/* Gallery */}
          {hall.images?.length > 0 && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 max-w-[1000px] mx-auto px-7"
            >
              {hall.images.map((img, i) => (
                <motion.img
                  key={i}
                  variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.35 } } }}
                  whileHover={{ scale: 1.04, boxShadow: '0 6px 20px rgba(26,26,70,.18)' }}
                  src={imageUrl(img)}
                  alt={`${hall.name} ${i + 1}`}
                  onClick={() => setLightbox(imageUrl(img))}
                  className="w-full aspect-[4/3] object-cover rounded-xl cursor-pointer shadow-[0_2px_10px_rgba(26,26,70,.10)]"
                />
              ))}
            </motion.div>
          )}
        </>
      ) : (
        <p className="text-center text-h-muted mt-24 text-lg">Hall not found.</p>
      )}

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />

      <DateModal
        open={dateModal}
        hallName={hall?.name}
        hallCapacity={hall?.capacity}
        hallCategory={hall?.category}
        hallCostPerDay={hall?.cost_per_day ?? 0}
        hallReservations={hall?.reservations ?? []}
        onConfirm={confirmReservation}
        onClose={() => setDateModal(false)}
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

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white text-sm font-semibold shadow-modal z-[200] ${toast.success ? 'bg-green-600' : 'bg-red-500'}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <p className="text-[15px] text-h-muted dark:text-gray-400 leading-relaxed mb-1.5">
      <strong className="text-h-text dark:text-gray-200 font-semibold">{label}:</strong> {value}
    </p>
  )
}
