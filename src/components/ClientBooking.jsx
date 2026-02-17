import { useState, useEffect } from 'react'
import { getSlotCounts, getBlockedSlots, createBooking, getNextDates, formatDate, getSlots, formatSlotTime, verifyClientByPhone, getDaysRemaining } from '../lib/supabase'

function ClientBooking() {
  // Auth state
  const [isVerified, setIsVerified] = useState(false)
  const [verifiedClient, setVerifiedClient] = useState(null)
  const [verifyPhone, setVerifyPhone] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState(null)

  // Booking state
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

  // Check if client was previously verified (session storage)
  useEffect(() => {
    const savedClient = sessionStorage.getItem('verified_client')
    if (savedClient) {
      try {
        const client = JSON.parse(savedClient)
        // Re-verify to check if still active
        verifyClientByPhone(client.phone).then(result => {
          if (result.success) {
            setVerifiedClient(result.client)
            setIsVerified(true)
          } else {
            sessionStorage.removeItem('verified_client')
          }
        })
      } catch (e) {
        sessionStorage.removeItem('verified_client')
      }
    }
  }, [])

  useEffect(() => {
    if (isVerified) {
      loadSlots()
    }
  }, [isVerified])

  useEffect(() => {
    if (isVerified && slots.length > 0) {
      loadSlotData()
    }
  }, [selectedDate, slots, isVerified])

  async function handleVerify(e) {
    e.preventDefault()
    if (!verifyPhone.trim()) {
      setVerifyError('Please enter your phone number')
      return
    }

    setVerifying(true)
    setVerifyError(null)

    const result = await verifyClientByPhone(verifyPhone.trim())

    setVerifying(false)

    if (result.success) {
      setVerifiedClient(result.client)
      setIsVerified(true)
      sessionStorage.setItem('verified_client', JSON.stringify(result.client))
    } else if (result.error === 'not_found') {
      setVerifyError('Phone number not registered. Please contact your trainer to register.')
    } else if (result.error === 'expired') {
      setVerifyError(`Your membership expired ${Math.abs(getDaysRemaining(result.client.end_date))} days ago. Please contact your trainer to renew.`)
    } else {
      setVerifyError('Verification failed. Please try again.')
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('verified_client')
    setIsVerified(false)
    setVerifiedClient(null)
    setVerifyPhone('')
  }

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
    // Pre-fill with client data
    setFormData({
      name: verifiedClient?.name || '',
      phone: verifiedClient?.phone || '',
      email: verifiedClient?.email || ''
    })
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

  // Show verification screen if not verified
  if (!isVerified) {
    return (
      <div>
        <div className="page-title-section">
          <h1 className="page-title">Welcome to FIT2FLY</h1>
          <p className="page-subtitle">Enter your registered phone number to book slots</p>
        </div>

        <div className="container">
          <div className="verify-card">
            <div className="verify-icon">📱</div>
            <h2 className="verify-title">Member Login</h2>
            <p className="verify-subtitle">Enter the phone number you registered with</p>

            <form onSubmit={handleVerify}>
              <div className="form-group">
                <input
                  type="tel"
                  className="form-input verify-input"
                  placeholder="Enter your phone number"
                  value={verifyPhone}
                  onChange={e => setVerifyPhone(e.target.value)}
                  autoFocus
                />
              </div>

              {verifyError && (
                <div className="verify-error">
                  {verifyError}
                </div>
              )}

              <button
                type="submit"
                className="btn-verify"
                disabled={verifying}
              >
                {verifying ? 'Verifying...' : 'Continue'}
              </button>
            </form>

            <p className="verify-help">
              Not a member? Contact trainer Murali to register.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show booking page if verified
  return (
    <div>
      <div className="page-title-section">
        <h1 className="page-title">Book Your Slot</h1>
        <p className="page-subtitle">
          Welcome back, <span style={{ color: 'var(--accent-red)' }}>{verifiedClient?.name}</span>!
          <button className="logout-link" onClick={handleLogout}>Switch Account</button>
        </p>
      </div>

      <div className="container">
        <div className="membership-banner">
          <span>Your membership is active</span>
          <span className="membership-days">{getDaysRemaining(verifiedClient?.end_date)} days left</span>
        </div>

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
                      readOnly
                      style={{ opacity: 0.7 }}
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
