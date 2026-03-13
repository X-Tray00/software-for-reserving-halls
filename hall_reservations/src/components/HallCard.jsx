import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { imageUrl } from '../api'

export const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function HallCard({ hall, deleteMode, editMode, onReserve, onDelete, onEdit }) {
  const navigate = useNavigate()
  const img = hall.images?.[0] ? imageUrl(hall.images[0]) : '/pics/test_hall.jpg'
  const inSpecialMode = deleteMode || editMode

  function handleClick() {
    if (deleteMode) onDelete(hall)
    else if (editMode) onEdit(hall)
    else navigate(`/halls/${hall.id}`)
  }

  return (
    <motion.div
      variants={cardVariants}
      whileHover={inSpecialMode ? {} : { y: -6 }}
      onClick={handleClick}
      className={`
        bg-white dark:bg-gray-800 rounded-[14px] shadow-card overflow-hidden cursor-pointer flex flex-col
        transition-shadow duration-200 hover:shadow-card-hover
        ${deleteMode ? 'outline outline-[3px] outline-red-500 animate-pulse-red' : ''}
        ${editMode   ? 'outline outline-[3px] outline-h-accent' : ''}
      `}
    >
      <div className="overflow-hidden h-[210px]">
        <motion.img
          src={img}
          alt={hall.name}
          whileHover={inSpecialMode ? {} : { scale: 1.04 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-h-primary dark:text-blue-200 text-[17px] mb-2">{hall.name}</h3>
        <p className="text-h-muted dark:text-gray-400 text-[13px] mb-1">📍 {hall.location}</p>
        <p className="text-h-muted dark:text-gray-400 text-[13px] mb-1">👥 {hall.capacity} people</p>
        <p className="text-h-muted dark:text-gray-400 text-[13px] mb-1">💰 {hall.cost_per_day} BGN / day</p>
        <p className="text-h-muted dark:text-gray-400 text-[13px] capitalize mb-3">🏷️ {hall.category}</p>

        {!inSpecialMode && (
          <button
            className="mt-auto w-full py-[11px] rounded-lg text-white text-sm font-semibold bg-green-gradient tracking-wide transition-all duration-200 hover:opacity-90 hover:-translate-y-px active:translate-y-0"
            onClick={e => { e.stopPropagation(); onReserve(hall.id) }}
          >
            Reserve
          </button>
        )}

        {deleteMode && (
          <div className="mt-auto flex items-center justify-center gap-2 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-semibold">
            🗑️ Click to delete
          </div>
        )}

        {editMode && (
          <div className="mt-auto flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-h-accent dark:text-purple-300 text-sm font-semibold">
            ✏️ Click to edit
          </div>
        )}
      </div>
    </motion.div>
  )
}
