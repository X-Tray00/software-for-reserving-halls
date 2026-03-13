import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { loginUser, registerUser } from '../api'

const FIRST_IMAGES = [
  '/pics/test_hall.jpg',
  '/pics/sport-hall3.jpg',
  '/pics/obredna-krasno-selo.jpg',
  '/pics/marinela-hall.jpg',
  '/pics/obredna-oborishte.jpg',
  '/pics/sport-hall2.jpg',
  '/pics/sport-hall1.jpg',
  '/pics/obredna-serdika.jpg',
  '/pics/obredna-sredec.jpg',
]

const SECOND_IMAGES = [
  '/pics/sport-hall4.jpg',
  '/pics/obredna-studentska.jpg',
  '/pics/montecito-hall.jpg',
  '/pics/sport-hall6.jpg',
  '/pics/contrast1.jpg',
  '/pics/obredna-triadica.jpg',
  '/pics/contrast-yinyang.jpg',
  '/pics/contrast-original.jpg',
  '/pics/sport-hall5.jpg',
]

// Smoother timing: 250ms/col, 900ms/row → total ~3.1s for all 9
const DELAYS = [0, 0.25, 0.5, 0.9, 1.15, 1.4, 1.8, 2.05, 2.3]
// Expo-out easing for a natural deceleration on each pop-in
const EASE_OUT = [0.16, 1, 0.3, 1]

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)

  // Start scroll after last image finishes popping in (~4s)
  useEffect(() => {
    const t = setTimeout(() => setScrolling(true), 4000)
    return () => clearTimeout(t)
  }, [])

  // Switch to login after showing registration success banner
  useEffect(() => {
    if (!regSuccess) return
    const t = setTimeout(() => { setRegSuccess(false); switchMode() }, 1800)
    return () => clearTimeout(t)
  }, [regSuccess])

  function validate() {
    const e = {}
    if (!username.trim()) e.username = 'Username is required.'
    if (!password.trim()) e.password = 'Password is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiError('')
    try {
      if (mode === 'login') {
        const { ok, data } = await loginUser(username.trim(), password.trim())
        if (ok) {
          sessionStorage.setItem('user', JSON.stringify(data.body))
          navigate('/halls', { replace: true })
        } else {
          setApiError(data?.message || 'Invalid username or password.')
        }
      } else {
        const { ok, data } = await registerUser(username.trim(), password.trim())
        if (ok) {
          setRegSuccess(true)
        } else {
          setApiError(data?.message || 'Registration failed.')
        }
      }
    } catch {
      setApiError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'register' : 'login')
    setUsername('')
    setPassword('')
    setErrors({})
    setApiError('')
  }

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: '#080814' }}>

      {/* ── Animated background ────────────────────────────── */}
      {/* Third grid always rendered so it's ready before scroll reaches it */}
      <div className={scrolling ? 'login-bg-wrapper login-bg-scroll' : 'login-bg-wrapper'}>
        <ImageGrid images={FIRST_IMAGES} delays={DELAYS} animated />
        <GridSep />
        <ImageGrid images={SECOND_IMAGES} animated={false} />
        <GridSep />
        <ImageGrid images={FIRST_IMAGES} animated={false} />
      </div>

      {/* Dark vignette overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse at center, rgba(8,8,20,0.45) 0%, rgba(8,8,20,0.72) 100%)',
      }} />

      {/* ── Form ───────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        height: '100vh', gap: 20,
      }}>

        {/* Branding */}
        <motion.h1
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          style={{
            margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: 0.5,
            background: 'linear-gradient(135deg, #d4bfff 0%, #a05d97 50%, #7b9fd4 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontFamily: 'Segoe UI, system-ui, sans-serif',
          }}
        >
          Hall Reservation Sofia
        </motion.h1>

        {/* Registration success banner */}
        <AnimatePresence>
          {regSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              style={{
                width: 340, padding: '10px 16px', borderRadius: 12,
                background: 'rgba(46,204,113,0.18)',
                border: '1px solid rgba(46,204,113,0.45)',
                color: '#6fcf97', fontSize: 13.5, fontWeight: 600,
                textAlign: 'center', fontFamily: 'Segoe UI, system-ui, sans-serif',
              }}
            >
              ✅ Account created! Please sign in.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.12, ease: EASE_OUT }}
          style={{
            width: 340,
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.13)',
            borderRadius: 22,
            padding: '32px 28px 28px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -18 : 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 18 : -18 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >
              <h2 style={{
                textAlign: 'center', margin: '0 0 24px',
                fontSize: 21, fontWeight: 700, color: '#fff',
                fontFamily: 'Segoe UI, system-ui, sans-serif',
              }}>
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>

              <AnimatePresence>
                {apiError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      background: 'rgba(255,70,70,0.12)',
                      border: '1px solid rgba(255,100,100,0.28)',
                      borderRadius: 10, padding: '9px 14px',
                      color: '#ff9090', fontSize: 13, textAlign: 'center',
                      fontFamily: 'Segoe UI, system-ui, sans-serif',
                    }}
                  >
                    {apiError}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} noValidate>
                <Field
                  label="Username"
                  value={username}
                  onChange={v => { setUsername(v); setErrors(e => ({ ...e, username: '' })) }}
                  error={errors.username}
                />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: '' })) }}
                  error={errors.password}
                />
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={loading ? {} : { opacity: 0.88, scale: 1.015 }}
                  whileTap={loading ? {} : { scale: 0.975 }}
                  style={{
                    width: '100%', padding: '11px 0', marginTop: 10, border: 'none',
                    background: loading
                      ? 'rgba(80,80,120,0.45)'
                      : 'linear-gradient(135deg, #26265c 0%, #a05d97 100%)',
                    color: 'white', fontSize: 15, fontWeight: 600,
                    borderRadius: 11, cursor: loading ? 'default' : 'pointer',
                    fontFamily: 'Segoe UI, system-ui, sans-serif',
                    letterSpacing: 0.3, transition: 'background 0.3s',
                    boxShadow: loading ? 'none' : '0 4px 16px rgba(160,93,151,0.35)',
                  }}
                >
                  {loading ? '···' : (mode === 'login' ? 'Sign in' : 'Create account')}
                </motion.button>
              </form>

              <p style={{
                marginTop: 20, fontSize: 13.5, textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: 'Segoe UI, system-ui, sans-serif',
              }}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <span
                  onClick={switchMode}
                  style={{ color: '#c9a8f0', cursor: 'pointer', fontWeight: 600 }}
                >
                  {mode === 'login' ? 'Register' : 'Sign in'}
                </span>
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

function GridSep() {
  return <div style={{ flexShrink: 0, width: 6, height: '100%', background: '#080814' }} />
}

// ─────────────────────────────────────────────────────────────
function ImageGrid({ images, animated, delays }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(3, 1fr)',
      gap: 6,
      flex: '0 0 33.33%',
      height: '100%',
    }}>
      {images.map((src, i) => (
        <motion.div
          key={src}
          initial={animated ? { opacity: 0, scale: 0.88 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={animated
            ? { delay: DELAYS[i], duration: 1.0, ease: EASE_OUT }
            : { duration: 0 }
          }
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '100%', height: '100%',
            opacity: 0.55,
          }}
        />
      ))}
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, error }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: error ? 2 : 14 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 0.7,
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
        marginBottom: 7, fontFamily: 'Segoe UI, system-ui, sans-serif',
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '10px 13px',
          border: `1.5px solid ${
            error    ? 'rgba(255,100,100,0.55)' :
            focused  ? 'rgba(160,93,151,0.85)'  :
                       'rgba(255,255,255,0.14)'
          }`,
          borderRadius: 9, boxSizing: 'border-box',
          background: error ? 'rgba(255,50,50,0.07)' : 'rgba(255,255,255,0.07)',
          color: '#fff', fontSize: 14, outline: 'none',
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          transition: 'border-color 0.18s',
        }}
      />
      {error && (
        <p style={{
          color: 'rgba(255,130,130,0.9)', fontSize: 12,
          margin: '5px 0 10px',
          fontFamily: 'Segoe UI, system-ui, sans-serif',
        }}>
          {error}
        </p>
      )}
    </div>
  )
}
