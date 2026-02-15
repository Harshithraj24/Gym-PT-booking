import { useState, useEffect } from 'react'
import { getSlotCounts, getBlockedSlots, createBooking, getNextDates, formatDate, getSlots, formatSlotTime } from '../lib/supabase'

function ClientBooking() {
  const dates = getNextDates()
  const [selectedDate, setSelectedDate] = useState(dates[0].date)
  const [slots, setSlots] = useState([])
  const [slotCounts, setSlotCounts] = useState({})
  const [blockedSlots, setBlockedSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookingSlot, setBookingSlot] = useState(null)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSlots()
  }, [])

  useEffect(() => {
    if (slots.length > 0) {
      loadSlotData()
    }
  }, [selectedDate, slots])

  async function loadSlots() {
    const slotsData = await getSlots()
    setSlots(slotsData)
  }

  async function loadSlotData() {
    setLoading(true)
    const [counts, blocked] = await Promise.all([
      getSlotCounts(selectedDate),
      getBlockedSlots(selectedDate)
    ])
    setSlotCounts(counts)
    setBlockedSlots(blocked)
    setLoading(false)
  }

  function isSlotBlocked(slotId) {
    return blockedSlots.some(b => b.slot_id === null || b.slot_id === slotId)
  }

  function getAvailableSpots(slot) {
    if (isSlotBlocked(slot.id)) return 0
    const maxCapacity = slot.max_capacity || 3
    return maxCapacity - (slotCounts[slot.id] || 0)
  }

  function getSpotsClass(available) {
    if (available === 0) return 'full'
    if (available === 1) return 'limited'
    return 'available'
  }

  function openBookingModal(slot) {
    setBookingSlot(slot)
    setFormData({ name: '', phone: '', email: '' })
    setSuccess(false)
    setError(null)
  }

  function closeModal() {
    setBookingSlot(null)
    setFormData({ name: '', phone: '', email: '' })
    setSuccess(false)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Please fill in name and phone number')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await createBooking(
      selectedDate,
      bookingSlot.id,
      formData.name.trim(),
      formData.phone.trim(),
      formData.email.trim()
    )

    setSubmitting(false)

    if (result.success) {
      setSuccess(true)
      loadSlotData()
      setTimeout(() => {
        closeModal()
      }, 2500)
    } else {
      setError(result.error || 'Booking failed. Please try again.')
    }
  }

  const selectedDateInfo = dates.find(d => d.date === selectedDate)
  const isDayBlocked = blockedSlots.some(b => b.slot_id === null)

  return (
    <div>
      <div className="page-title-section">
        <h1 className="page-title">Book Your Slot</h1>
        <p className="page-subtitle">Select a date and time that works for you</p>
      </div>

      <div className="container">
        <div className="date-selector">
          {dates.map(d => (
            <button
              key={d.date}
              className={`date-btn ${selectedDate === d.date ? 'active' : ''}`}
              onClick={() => setSelectedDate(d.date)}
            >
              <span className="date-day">{d.dayName}</span>
              <span className="date-num">{d.dayNum}</span>
              <span className="date-month">{d.month}</span>
              {d.isToday && <span className="date-today">Today</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : isDayBlocked ? (
          <div className="empty-state">
            <div className="empty-icon">&#128683;</div>
            <p className="empty-text">Not Available</p>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
              {blockedSlots.find(b => b.slot_id === null)?.reason || 'This day is blocked for bookings'}
            </p>
          </div>
        ) : (
          <div className="slots-grid">
            {slots.map(slot => {
              const blocked = isSlotBlocked(slot.id)
              const available = getAvailableSpots(slot)
              const isFull = available === 0

              return (
                <div key={slot.id} className={`slot-card ${isFull || blocked ? 'full' : ''}`}>
                  <div className="slot-header">
                    <div>
                      <h3 className="slot-name">{slot.name}</h3>
                      <p className="slot-time">{formatSlotTime(slot)}</p>
                    </div>
                    <div className="slot-availability">
                      <div className={`spots-count ${getSpotsClass(available)}`}>
                        {blocked ? '-' : available}
                      </div>
                      <div className="spots-label">
                        {blocked ? 'Blocked' : available === 1 ? 'spot left' : 'spots left'}
                      </div>
                    </div>
                  </div>
                  <button
                    className="book-btn"
                    disabled={isFull || blocked}
                    onClick={() => openBookingModal(slot)}
                  >
                    {blocked ? 'Not Available' : isFull ? 'Fully Booked' : 'Book Now'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {bookingSlot && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {success ? (
              <div className="success-message">
                <div className="success-icon">&#10003;</div>
                <h3 className="success-text">Booking Confirmed!</h3>
                <p className="success-details">
                  {formatDate(selectedDate)} &bull; {bookingSlot.name}
                </p>
                <p style={{ color: 'var(--text-muted)', marginTop: '12px', fontSize: '0.9rem' }}>
                  See you at the gym!
                </p>
              </div>
            ) : (
              <>
                <h2 className="modal-title">Book Your Slot</h2>
                <p className="modal-subtitle">
                  {formatDate(selectedDate)} &bull; {bookingSlot.name} ({formatSlotTime(bookingSlot)})
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Your Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email (optional)</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Enter your email for confirmation"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  {error && (
                    <div className="toast error" style={{ position: 'relative', marginBottom: '16px' }}>
                      {error}
                    </div>
                  )}

                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={closeModal}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-confirm"
                      disabled={submitting}
                    >
                      {submitting ? 'Booking...' : 'Confirm'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientBooking
