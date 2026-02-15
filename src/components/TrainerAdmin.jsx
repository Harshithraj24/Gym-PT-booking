import { useState, useEffect } from 'react'
import { SLOTS, DAYS, getAllBookings, deleteBooking } from '../lib/supabase'
import AdminLogin from './AdminLogin'

function TrainerAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true'
  })
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDay, setFilterDay] = useState('all')
  const [filterSlot, setFilterSlot] = useState('all')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (isAuthenticated) {
      loadBookings()
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />
  }

  async function loadBookings() {
    setLoading(true)
    const data = await getAllBookings()
    setBookings(data)
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    setDeleting(id)
    const result = await deleteBooking(id)
    setDeleting(null)

    if (result.success) {
      setBookings(bookings.filter(b => b.id !== id))
    } else {
      alert('Failed to delete booking: ' + result.error)
    }
  }

  function getSlotName(slotId) {
    return SLOTS.find(s => s.id === slotId)?.name || slotId
  }

  function getSlotTime(slotId) {
    return SLOTS.find(s => s.id === slotId)?.time || ''
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredBookings = bookings.filter(booking => {
    if (filterDay !== 'all' && booking.day !== filterDay) return false
    if (filterSlot !== 'all' && booking.slot_id !== filterSlot) return false
    return true
  })

  const stats = {
    total: bookings.length,
    today: bookings.filter(b => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return b.day === days[new Date().getDay()]
    }).length
  }

  return (
    <div>
      <div className="page-title-section">
        <h1 className="page-title">Trainer Dashboard</h1>
        <p className="page-subtitle">Manage all bookings</p>
      </div>

      <div className="container">
        <div className="admin-header">
          <div className="admin-stats">
            <div className="stat-box">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Bookings</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">{stats.today}</div>
              <div className="stat-label">Today</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="nav-link" onClick={loadBookings} style={{ cursor: 'pointer' }}>
              Refresh
            </button>
            <button
              className="nav-link"
              onClick={() => {
                sessionStorage.removeItem('admin_authenticated')
                setIsAuthenticated(false)
              }}
              style={{ cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="filter-section">
          <button
            className={`filter-btn ${filterDay === 'all' ? 'active' : ''}`}
            onClick={() => setFilterDay('all')}
          >
            All Days
          </button>
          {DAYS.map(day => (
            <button
              key={day}
              className={`filter-btn ${filterDay === day ? 'active' : ''}`}
              onClick={() => setFilterDay(day)}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        <div className="filter-section">
          <button
            className={`filter-btn ${filterSlot === 'all' ? 'active' : ''}`}
            onClick={() => setFilterSlot('all')}
          >
            All Slots
          </button>
          {SLOTS.map(slot => (
            <button
              key={slot.id}
              className={`filter-btn ${filterSlot === slot.id ? 'active' : ''}`}
              onClick={() => setFilterSlot(slot.id)}
            >
              {slot.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">&#128197;</div>
            <p className="empty-text">No bookings found</p>
          </div>
        ) : (
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Slot</th>
                <th>Client</th>
                <th>Phone</th>
                <th>Booked At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(booking => (
                <tr key={booking.id}>
                  <td>
                    <span className="badge badge-day">{booking.day}</span>
                  </td>
                  <td>
                    <div>
                      <span className="badge badge-slot">{getSlotName(booking.slot_id)}</span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {getSlotTime(booking.slot_id)}
                      </div>
                    </div>
                  </td>
                  <td>{booking.client_name}</td>
                  <td>{booking.client_phone}</td>
                  <td>{formatDate(booking.booked_at)}</td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(booking.id)}
                      disabled={deleting === booking.id}
                    >
                      {deleting === booking.id ? 'Deleting...' : 'Cancel'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default TrainerAdmin
