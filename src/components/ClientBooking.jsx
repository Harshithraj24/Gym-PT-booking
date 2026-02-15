import { useState, useEffect } from 'react'
import { SLOTS, DAYS, MAX_BOOKINGS_PER_SLOT, getSlotCounts, createBooking } from '../lib/supabase'

function ClientBooking() {
  const [selectedDay, setSelectedDay] = useState(getCurrentDay())
  const [slotCounts, setSlotCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [bookingSlot, setBookingSlot] = useState(null)
  const [formData, setFormData] = useState({ name: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  function getCurrentDay() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date().getDay()]
  }

  useEffect(() => {
    loadSlotCounts()
  }, [selectedDay])

  async function loadSlotCounts() {
    setLoading(true)
    const counts = await getSlotCounts(selectedDay)
    setSlotCounts(counts)
    setLoading(false)
  }

  function getAvailableSpots(slotId) {
    return MAX_BOOKINGS_PER_SLOT - (slotCounts[slotId] || 0)
  }

  function getSpotsClass(available) {
    if (available === 0) return 'full'
    if (available === 1) return 'limited'
    return 'available'
  }

  function openBookingModal(slot) {
    setBookingSlot(slot)
    setFormData({ name: '', phone: '' })
    setSuccess(false)
    setError(null)
  }

  function closeModal() {
    setBookingSlot(null)
    setFormData({ name: '', phone: '' })
    setSuccess(false)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Please fill in all fields')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await createBooking(
      selectedDay,
      bookingSlot.id,
      formData.name.trim(),
      formData.phone.trim()
    )

    setSubmitting(false)

    if (result.success) {
      setSuccess(true)
      loadSlotCounts()
      setTimeout(() => {
        closeModal()
      }, 2000)
    } else {
      setError(result.error || 'Booking failed. Please try again.')
    }
  }

  return (
    <div>
      <div className="page-title-section">
        <h1 className="page-title">Book Your Slot</h1>
        <p className="page-subtitle">Select a day and time that works for you</p>
      </div>

      <div className="container">
        <div className="day-selector">
          {DAYS.map(day => (
            <button
              key={day}
              className={`day-btn ${selectedDay === day ? 'active' : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="slots-grid">
            {SLOTS.map(slot => {
              const available = getAvailableSpots(slot.id)
              const isFull = available === 0

              return (
                <div key={slot.id} className={`slot-card ${isFull ? 'full' : ''}`}>
                  <div className="slot-header">
                    <div>
                      <h3 className="slot-name">{slot.name}</h3>
                      <p className="slot-time">{slot.time}</p>
                    </div>
                    <div className="slot-availability">
                      <div className={`spots-count ${getSpotsClass(available)}`}>
                        {available}
                      </div>
                      <div className="spots-label">
                        {available === 1 ? 'spot left' : 'spots left'}
                      </div>
                    </div>
                  </div>
                  <button
                    className="book-btn"
                    disabled={isFull}
                    onClick={() => openBookingModal(slot)}
                  >
                    {isFull ? 'Fully Booked' : 'Book Now'}
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
                  {selectedDay} &bull; {bookingSlot.name}
                </p>
              </div>
            ) : (
              <>
                <h2 className="modal-title">Book Your Slot</h2>
                <p className="modal-subtitle">
                  {selectedDay} &bull; {bookingSlot.name} ({bookingSlot.time})
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Your Name</label>
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
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
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
