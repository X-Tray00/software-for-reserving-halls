import { motion, AnimatePresence } from 'framer-motion'

export default function Lightbox({ src, onClose }) {
  return (
    <AnimatePresence>
      {src && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/88"
          style={{ backdropFilter: 'blur(6px)' }}
        >
          <motion.img
            src={src}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className="max-w-[90vw] max-h-[88vh] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,.5)] object-contain"
            alt="Preview"
          />
          <button
            onClick={onClose}
            className="absolute top-5 right-6 text-white/80 hover:text-white text-3xl leading-none transition-transform hover:scale-110 z-10"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
