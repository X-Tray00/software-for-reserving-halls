import { motion, AnimatePresence } from 'framer-motion'

export default function DarkModeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'relative',
        width: 68,
        height: 34,
        borderRadius: 17,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Track background — transitions between day sky and night sky */}
      <motion.div
        animate={{
          background: dark
            ? 'linear-gradient(135deg, #0f172a, #1e3a5f)'
            : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
        }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0, borderRadius: 17 }}
      />

      {/* Stars — only visible in dark mode */}
      <AnimatePresence>
        {dark && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {[
              { top: '18%', left: '12%', size: 2 },
              { top: '55%', left: '20%', size: 1.5 },
              { top: '30%', left: '30%', size: 2.5 },
              { top: '65%', left: '38%', size: 1.5 },
            ].map((s, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.8 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: s.top,
                  left: s.left,
                  width: s.size,
                  height: s.size,
                  borderRadius: '50%',
                  background: 'white',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clouds — only visible in light mode */}
      <AnimatePresence>
        {!dark && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <div style={{
              position: 'absolute', right: 9, top: '22%',
              fontSize: 10, lineHeight: 1, opacity: 0.9,
            }}>☁️</div>
            <div style={{
              position: 'absolute', right: 16, bottom: '15%',
              fontSize: 7, lineHeight: 1, opacity: 0.7,
            }}>☁️</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sliding knob */}
      <motion.div
        animate={{ x: dark ? 36 : 4 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        style={{
          position: 'absolute',
          top: 4,
          left: 0,
          width: 26,
          height: 26,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          background: dark
            ? 'radial-gradient(circle at 35% 35%, #f0f4ff, #c7d2fe)'
            : 'radial-gradient(circle at 40% 35%, #fde68a, #f59e0b)',
          boxShadow: dark
            ? '0 0 10px rgba(199,210,254,.55), 0 2px 6px rgba(0,0,0,.3)'
            : '0 0 14px rgba(251,191,36,.7), 0 2px 6px rgba(0,0,0,.2)',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={dark ? 'moon' : 'sun'}
            initial={{ scale: 0, rotate: dark ? 60 : -60, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: dark ? -60 : 60, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ display: 'block', lineHeight: 1 }}
          >
            {dark ? '🌙' : '☀️'}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </button>
  )
}
