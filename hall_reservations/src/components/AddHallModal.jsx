import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createHall } from '../api'

const CATEGORIES = ['Wedding', 'Sports', 'Congress', 'Party']

export default function AddHallModal({ open, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', category: '', city: '', street: '', number: '', capacity: '', cost_per_day: '', contact: '' })
  const [mainImage, setMainImage] = useState(null)
  const [extraImages, setExtraImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')

    if (!form.category) { setErr('Please select a category.'); return }
    const capacity = parseInt(form.capacity, 10)
    const cost = parseFloat(form.cost_per_day)
    if (isNaN(capacity) || capacity <= 0) { setErr('Capacity must be a positive number.'); return }
    if (isNaN(cost) || cost <= 0) { setErr('Price must be a positive number.'); return }

    const hallData = {
      name: form.name,
      category: form.category,
      location: `${form.city}, ${form.street}, ${form.number}`,
      capacity,
      cost_per_day: cost,
      contact: form.contact,
    }

    const fd = new FormData()
    fd.append('hall', JSON.stringify(hallData))
    if (mainImage) fd.append('images', mainImage)
    for (const f of extraImages) fd.append('images', f)

    setLoading(true)
    try {
      const { ok, data } = await createHall(fd)
      if (ok) {
        setForm({ name: '', category: '', city: '', street: '', number: '', capacity: '', cost_per_day: '', contact: '' })
        setMainImage(null); setExtraImages([])
        onAdded()
        onClose()
      } else {
        setErr(data.message || 'Failed to add hall.')
      }
    } catch (e) {
      setErr('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[460px] max-h-[90vh] overflow-y-auto bg-white rounded-[18px] shadow-modal p-8"
          >
            <h2 className="text-center text-h-primary font-bold text-xl mb-5">Add New Hall</h2>

            <form onSubmit={handleSubmit} className="space-y-1">
              <Label>Hall Name</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Grand Ballroom" required />

              <Label>Category</Label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className={`w-full px-3.5 py-2.5 border-2 border-[#e0ddf0] rounded-lg text-sm bg-[#fafafa] outline-none focus:border-h-mid focus:bg-white transition-colors ${!form.category ? 'text-gray-400' : 'text-h-text'}`}
                required
              >
                <option value="">Select category…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <Label>City</Label>
              <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Sofia" required />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Street</Label>
                  <Input value={form.street} onChange={e => set('street', e.target.value)} placeholder="Vitosha Blvd" required />
                </div>
                <div>
                  <Label>Number</Label>
                  <Input value={form.number} onChange={e => set('number', e.target.value)} placeholder="42" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Capacity</Label>
                  <Input type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="100" required />
                </div>
                <div>
                  <Label>Price / day (BGN)</Label>
                  <Input type="number" min="1" step="0.01" value={form.cost_per_day} onChange={e => set('cost_per_day', e.target.value)} placeholder="500" required />
                </div>
              </div>

              <Label>Contact (optional)</Label>
              <Input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="+359 …" />

              <Label>Main Image</Label>
              <input type="file" accept="image/*" onChange={e => setMainImage(e.target.files[0])}
                className="w-full text-sm text-h-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#f0eefa] file:text-h-accent-dark file:font-medium hover:file:bg-[#e4daf0] cursor-pointer" />

              <Label>Additional Images</Label>
              <input type="file" accept="image/*" multiple onChange={e => setExtraImages(Array.from(e.target.files))}
                className="w-full text-sm text-h-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#f0eefa] file:text-h-accent-dark file:font-medium hover:file:bg-[#e4daf0] cursor-pointer" />

              {err && <p className="text-red-500 text-sm pt-1">{err}</p>}

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 rounded-lg text-white font-semibold bg-btn-gradient hover:opacity-90 transition-opacity disabled:opacity-60">
                  {loading ? 'Adding…' : 'Add Hall'}
                </button>
                <button type="button" onClick={onClose}
                  className="flex-1 py-3 rounded-lg font-semibold bg-[#f0eefa] text-h-accent-dark hover:bg-[#e4daf0] transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Label({ children }) {
  return <label className="block text-xs font-semibold text-h-muted uppercase tracking-wide mt-3 mb-1">{children}</label>
}

function Input({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 border-2 border-[#e0ddf0] rounded-lg text-sm text-h-text placeholder:text-gray-500 bg-[#fafafa] outline-none focus:border-h-mid focus:bg-white transition-colors ${className}`}
    />
  )
}
