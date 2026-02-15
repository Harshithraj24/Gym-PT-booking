import { useState, useEffect } from 'react'
import { SLOTS, getAllBookings, deleteBooking, getAllBlockedSlots, blockSlot, unblockSlot, formatDate } from '../lib/supabase'
import AdminLogin from './AdminLogin'

function TrainerAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true'
  })
  const [activeTab, setActiveTab] = useState('bookings')
  const [bookings, setBookings] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('all')
  const [filterSlot, setFilterSlot] = useState('all')
  const [deleting, setDeleting] = useState(null)

  // Block form state
  const [blockDate, setBlockDate] = useState('')
  const [blockSlotId, setBlockSlotId] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [blocking, setBlocking] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />
  }

  async function loadData() {
    setLoading(true)
    const [bookingsData, blockedData] = await Promise.all([
      getAllBookings(),
      getAllBlockedSlots()
    ])
    setBookings(bookingsData)
    setBlockedSlots(blockedData)
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

  async function handleBlock(e) {
    e.preventDefault()
    if (!blockDate) {
      alert('Please select a date')
      return
    }

    setBlocking(true)
    const result = await blockSlot(blockDate, blockSlotId || null, blockReason)
    setBlocking(false)

    if (result.success) {
      setBlockedSlots([...blockedSlots, result.data])
      setBlockDate('')
      setBlockSlotId('')
      setBlockReason('')
    } else {
      alert('Failed to block slot: ' + result.error)
    }
  }

  async function handleUnblock(id) {
    const result = await unblockSlot(id)
    if (result.success) {
      setBlockedSlots(blockedSlots.filter(b => b.id !== id))
    } else {
      alert('Failed to unblock: ' + result.error)
    }
  }

  function getSlotName(slotId) {
    return SLOTS.find(s => s.id === slotId)?.name || slotId
  }

  function getSlotTime(slotId) {
    return SLOTS.find(s => s.id === slotId)?.time || ''
  }

  function formatDateTime(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get unique dates from bookings
  const uniqueDates = [...new Set(bookings.map(b => b.booking_date).filter(Boolean))].sort()

  const filteredBookings = bookings.filter(booking => {
    if (filterDate !== 'all' && booking.booking_date !== filterDate) return false
    if (filterSlot !== 'all' && booking.slot_id !== filterSlot) return false
    return true
  })

  const todayStr = new Date().toISOString().split('T')[0]
  const stats = {
    total: bookings.length,
    today: bookings.filter(b => b.booking_date === todayStr).length,
    upcoming: bookings.filter(b => b.booking_date >= todayStr).length
  }

  return (
    <div>
      <div className="page-title-section">
        <h1 className="page-title">Trainer Dashboard</h1>
        <p className="page-subtitle">Manage bookings and availability</p>
      </div>

      <div className="container">
        <div className="admin-header">
          <div className="admin-stats">
            <div className="stat-box">
              <div className="stat-number">{stats.upcoming}</div>
              <div className="stat-label">Upcoming</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">{stats.today}</div>
              <div className="stat-label">Today</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">{blockedSlots.length}</div>
              <div className="stat-label">Blocked</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="nav-link" onClick={loadData} style={{ cursor: 'pointer' }}>
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

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            Bookings
          </button>
          <button
            className={`admin-tab ${activeTab === 'blocked' ? 'active' : ''}`}
            onClick={() => setActiveTab('blocked')}
          >
            Block Slots
          </button>
        </div>

        {activeTab === 'bookings' && (
          <>
            <div className="filter-section">
              <button
                className={`filter-btn ${filterDate === 'all' ? 'active' : ''}`}
                onClick={() => setFilterDate('all')}
              >
                All Dates
              </button>
              <button
                className={`filter-btn ${filterDate === todayStr ? 'active' : ''}`}
                onClick={() => setFilterDate(todayStr)}
              >
                Today
              </button>
              {uniqueDates.slice(0, 7).map(date => (
                date !== todayStr && (
                  <button
                    key={date}
                    className={`filter-btn ${filterDate === date ? 'active' : ''}`}
                    onClick={() => setFilterDate(date)}
                  >
                    {formatDate(date)}
                  </button>
                )
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
                    <th>Date</th>
                    <th>Slot</th>
                    <th>Client</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Booked At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map(booking => (
                    <tr key={booking.id}>
                      <td>
                        <span className="badge badge-day">
                          {booking.booking_date ? formatDate(booking.booking_date) : booking.day}
                        </span>
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
                      <td>
                        <a href={`tel:${booking.client_phone}`} style={{ color: 'var(--accent-red)' }}>
                          {booking.client_phone}
                        </a>
                      </td>
                      <td>
                        {booking.client_email ? (
                          <a href={`mailto:${booking.client_email}`} style={{ color: 'var(--accent-red)' }}>
                            {booking.client_email}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td>{formatDateTime(booking.booked_at)}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(booking.id)}
                          disabled={deleting === booking.id}
                        >
                          {deleting === booking.id ? '...' : 'Cancel'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === 'blocked' && (
          <>
            <div className="block-form">
              <h3 className="block-form-title">Block a Date or Slot</h3>
              <form onSubmit={handleBlock}>
                <div className="block-form-row">
                  <div className="block-form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={blockDate}
                      onChange={e => setBlockDate(e.target.value)}
                      min={todayStr}
                      required
                    />
                  </div>
                  <div className="block-form-group">
                    <label>Slot (optional)</label>
                    <select value={blockSlotId} onChange={e => setBlockSlotId(e.target.value)}>
                      <option value="">Entire Day</option>
                      {SLOTS.map(slot => (
                        <option key={slot.id} value={slot.id}>{slot.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="block-form-group">
                    <label>Reason (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., Holiday, Personal"
                      value={blockReason}
                      onChange={e => setBlockReason(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="block-form-btn" disabled={blocking}>
                    {blocking ? 'Blocking...' : 'Block'}
                  </button>
                </div>
              </form>
            </div>

            <h3 style={{ fontFamily: 'Oswald', marginBottom: '16px', textTransform: 'uppercase' }}>
              Blocked Dates & Slots
            </h3>

            {blockedSlots.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">&#10003;</div>
                <p className="empty-text">No blocked slots</p>
              </div>
            ) : (
              <div className="blocked-list">
                {blockedSlots.map(block => (
                  <div key={block.id} className="blocked-item">
                    <div className="blocked-info">
                      <span className="blocked-date">{formatDate(block.blocked_date)}</span>
                      <span className="blocked-slot">
                        {block.slot_id ? getSlotName(block.slot_id) : 'Entire Day'}
                      </span>
                      {block.reason && <span className="blocked-reason">"{block.reason}"</span>}
                    </div>
                    <button className="unblock-btn" onClick={() => handleUnblock(block.id)}>
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default TrainerAdmin
