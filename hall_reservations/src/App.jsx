import { createContext, useContext, useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import HallsPage from './pages/HallsPage'
import HallGalleryPage from './pages/HallGalleryPage'
import HistoryPage from './pages/HistoryPage'
import ReservationsPage from './pages/ReservationsPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import useDarkMode from './useDarkMode'
import { refreshSession } from './api'

export const DarkModeContext = createContext([false, () => {}])
export function useDark() { return useContext(DarkModeContext) }

export default function App() {
  const darkMode = useDarkMode()
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    function handleExpired() { setSessionExpired(true) }
    window.addEventListener('session-expired', handleExpired)
    return () => window.removeEventListener('session-expired', handleExpired)
  }, [])

  async function handleSessionChoice(keepReserving) {
    setSessionExpired(false)
    if (keepReserving) {
      const ok = await refreshSession()
      if (!ok) {
        sessionStorage.clear()
        window.location.href = '/#/login'
      } else {
        // Новите access/refresh токени вече са в HttpOnly cookies.
        // Презареждаме SPA-то, за да се реинициализират страниците и да си
        // извикат отново fetch-овете (напр. /api/halls), вече с валидна сесия.
        window.location.reload()
      }
    } else {
      sessionStorage.clear()
      window.location.href = '/#/login'
    }
  }

  return (
    <DarkModeContext.Provider value={darkMode}>
      <HashRouter>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/halls" element={<HallsPage />} />
            <Route path="/halls/:id" element={<HallGalleryPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
          </Routes>
        </AnimatePresence>
      </HashRouter>

      {sessionExpired && (
        <SessionExpiredModal onChoice={handleSessionChoice} />
      )}
    </DarkModeContext.Provider>
  )
}

function SessionExpiredModal({ onChoice }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="w-[90%] max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-modal px-6 py-6 text-center">
        <h2 className="text-h-primary dark:text-blue-200 font-bold text-lg mb-2">
          The session has expired!
        </h2>
        <p className="text-h-muted dark:text-gray-300 text-sm mb-5">
          Do you wish to continue reserving?
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => onChoice(true)}
            className="flex-1 py-2.5 rounded-full text-white text-sm font-semibold bg-btn-gradient hover:opacity-90 transition-opacity"
          >
            Yes
          </button>
          <button
            onClick={() => onChoice(false)}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-[#f0eefa] dark:bg-gray-700 text-h-primary dark:text-gray-100 hover:bg-[#e4daf0] dark:hover:bg-gray-600 transition-colors"
          >
            No
          </button>
        </div>
      </div>
    </div>
  )
}
