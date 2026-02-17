import { useState, useEffect } from 'react'
import { getAllBookings, deleteBooking, getAllBlockedSlots, blockSlot, unblockSlot, formatDate, getAllSlots, createSlot, updateSlot, deleteSlot, toggleSlotActive, formatSlotTime, getAllClients, addClient, updateClient, deleteClient, renewClient, PLAN_TYPES, getDaysRemaining, getClientStatus, getClientBookingHistory, generateICSCalendar, generateBookingsCSV, generateClientsCSV, downloadFile } from '../lib/supabase'
import AdminLogin from './AdminLogin'

function TrainerAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true'
  })
  const [activeTab, setActiveTab] = useState('bookings')
  const [bookings, setBookings] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [slots, setSlots] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('all')
  const [filterSlot, setFilterSlot] = useState('all')
  const [deleting, setDeleting] = useState(null)

  // Block form state
  const [blockDate, setBlockDate] = useState('')
  const [blockSlotId, setBlockSlotId] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [blocking, setBlocking] = useState(false)

  // Slot management state
  const [slotForm, setSlotForm] = useState({ name: '', timeStart: '', timeEnd: '', maxCapacity: 3 })
  const [editingSlot, setEditingSlot] = useState(null)
  const [savingSlot, setSavingSlot] = useState(false)

  // Client management state
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '', planType: '1_month', startDate: '', notes: '' })
  const [editingClient, setEditingClient] = useState(null)
  const [savingClient, setSavingClient] = useState(false)
  const [renewingClient, setRenewingClient] = useState(null)
  const [renewPlanType, setRenewPlanType] = useState('1_month')
  const [clientFilter, setClientFilter] = useState('all')

  // Booking history modal state
  const [historyClient, setHistoryClient] = useState(null)
  const [clientHistory, setClientHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

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
    const [bookingsData, blockedData, slotsData, clientsData] = await Promise.all([
      getAllBookings(),
      getAllBlockedSlots(),
      getAllSlots(),
      getAllClients()
    ])
    setBookings(bookingsData)
    setBlockedSlots(blockedData)
    setSlots(slotsData)
    setClients(clientsData)
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
    const slot = slots.find(s => s.id === slotId)
    return slot?.name || slotId
  }

  function getSlotTime(slotId) {
    const slot = slots.find(s => s.id === slotId)
    return slot ? formatSlotTime(slot) : ''
  }

  // Slot management functions
  async function handleAddSlot(e) {
    e.preventDefault()
    if (!slotForm.name || !slotForm.timeStart || !slotForm.timeEnd) {
      alert('Please fill in slot name and times')
      return
    }

    setSavingSlot(true)
    const result = await createSlot(
      slotForm.name,
      slotForm.timeStart,
      slotForm.timeEnd,
      parseInt(slotForm.maxCapacity) || 3
    )
    setSavingSlot(false)

    if (result.success) {
      setSlots([...slots, result.data])
      setSlotForm({ name: '', timeStart: '', timeEnd: '', maxCapacity: 3 })
    } else {
      alert('Failed to add slot: ' + result.error)
    }
  }

  async function handleUpdateSlot(e) {
    e.preventDefault()
    if (!editingSlot) return

    setSavingSlot(true)
    const result = await updateSlot(editingSlot.id, {
      name: slotForm.name,
      time_start: slotForm.timeStart,
      time_end: slotForm.timeEnd,
      max_capacity: parseInt(slotForm.maxCapacity) || 3
    })
    setSavingSlot(false)

    if (result.success) {
      setSlots(slots.map(s => s.id === editingSlot.id ? result.data : s))
      setEditingSlot(null)
      setSlotForm({ name: '', timeStart: '', timeEnd: '', maxCapacity: 3 })
    } else {
      alert('Failed to update slot: ' + result.error)
    }
  }

  async function handleDeleteSlot(id) {
    if (!confirm('Are you sure you want to delete this slot? This cannot be undone.')) return

    const result = await deleteSlot(id)
    if (result.success) {
      setSlots(slots.filter(s => s.id !== id))
    } else {
      alert('Failed to delete slot: ' + result.error)
    }
  }

  async function handleToggleSlot(id, currentActive) {
    const result = await toggleSlotActive(id, !currentActive)
    if (result.success) {
      setSlots(slots.map(s => s.id === id ? { ...s, is_active: !currentActive } : s))
    } else {
      alert('Failed to toggle slot: ' + result.error)
    }
  }

  function startEditSlot(slot) {
    setEditingSlot(slot)
    setSlotForm({
      name: slot.name,
      timeStart: slot.time_start,
      timeEnd: slot.time_end,
      maxCapacity: slot.max_capacity
    })
  }

  function cancelEditSlot() {
    setEditingSlot(null)
    setSlotForm({ name: '', timeStart: '', timeEnd: '', maxCapacity: 3 })
  }

  // Client management functions
  async function handleAddClient(e) {
    e.preventDefault()
    if (!clientForm.name || !clientForm.phone || !clientForm.startDate) {
      alert('Please fill in name, phone, and start date')
      return
    }

    setSavingClient(true)
    const result = await addClient({
      name: clientForm.name,
      phone: clientForm.phone,
      email: clientForm.email,
      plan_type: clientForm.planType,
      start_date: clientForm.startDate,
      notes: clientForm.notes
    })
    setSavingClient(false)

    if (result.success) {
      setClients([...clients, result.data])
      setClientForm({ name: '', phone: '', email: '', planType: '1_month', startDate: '', notes: '' })
    } else {
      alert('Failed to add client: ' + result.error)
    }
  }

  async function handleUpdateClient(e) {
    e.preventDefault()
    if (!editingClient) return

    setSavingClient(true)
    const result = await updateClient(editingClient.id, {
      name: clientForm.name,
      phone: clientForm.phone,
      email: clientForm.email,
      plan_type: clientForm.planType,
      start_date: clientForm.startDate,
      notes: clientForm.notes
    })
    setSavingClient(false)

    if (result.success) {
      setClients(clients.map(c => c.id === editingClient.id ? result.data : c))
      setEditingClient(null)
      setClientForm({ name: '', phone: '', email: '', planType: '1_month', startDate: '', notes: '' })
    } else {
      alert('Failed to update client: ' + result.error)
    }
  }

  async function handleDeleteClient(id) {
    if (!confirm('Are you sure you want to delete this client?')) return

    const result = await deleteClient(id)
    if (result.success) {
      setClients(clients.filter(c => c.id !== id))
    } else {
      alert('Failed to delete client: ' + result.error)
    }
  }

  async function handleRenewClient(id) {
    const result = await renewClient(id, renewPlanType)
    if (result.success) {
      setClients(clients.map(c => c.id === id ? result.data : c))
      setRenewingClient(null)
      setRenewPlanType('1_month')
    } else {
      alert('Failed to renew client: ' + result.error)
    }
  }

  function startEditClient(client) {
    setEditingClient(client)
    setClientForm({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      planType: client.plan_type,
      startDate: client.start_date,
      notes: client.notes || ''
    })
  }

  function cancelEditClient() {
    setEditingClient(null)
    setClientForm({ name: '', phone: '', email: '', planType: '1_month', startDate: '', notes: '' })
  }

  function getPlanName(planType) {
    return PLAN_TYPES.find(p => p.id === planType)?.name || planType
  }

  // Booking history functions
  async function viewClientHistory(client) {
    setHistoryClient(client)
    setLoadingHistory(true)
    const history = await getClientBookingHistory(client.phone)
    setClientHistory(history)
    setLoadingHistory(false)
  }

  function closeHistoryModal() {
    setHistoryClient(null)
    setClientHistory([])
  }

  // Export functions
  function exportBookingsToCalendar() {
    const icsContent = generateICSCalendar(bookings, slots)
    const today = new Date().toISOString().split('T')[0]
    downloadFile(icsContent, `fit2fly-bookings-${today}.ics`, 'text/calendar')
  }

  function exportBookingsToCSV() {
    const csvContent = generateBookingsCSV(bookings, slots)
    const today = new Date().toISOString().split('T')[0]
    downloadFile(csvContent, `fit2fly-bookings-${today}.csv`, 'text/csv')
  }

  function exportClientsToCSV() {
    const csvContent = generateClientsCSV(clients)
    const today = new Date().toISOString().split('T')[0]
    downloadFile(csvContent, `fit2fly-clients-${today}.csv`, 'text/csv')
  }

  function exportClientHistoryToCalendar(history, client) {
    const icsContent = generateICSCalendar(history, slots)
    downloadFile(icsContent, `fit2fly-${client.name.replace(/\s+/g, '-')}-bookings.ics`, 'text/calendar')
  }

  // Filter clients
  const filteredClients = clients.filter(client => {
    if (clientFilter === 'all') return true
    const status = getClientStatus(client.end_date)
    if (clientFilter === 'active') return status === 'active'
    if (clientFilter === 'expiring') return status === 'expiring'
    if (clientFilter === 'expired') return status === 'expired'
    return true
  })

  // Client stats
  const clientStats = {
    total: clients.length,
    active: clients.filter(c => getClientStatus(c.end_date) === 'active').length,
    expiring: clients.filter(c => getClientStatus(c.end_date) === 'expiring').length,
    expired: clients.filter(c => getClientStatus(c.end_date) === 'expired').length
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
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="export-btn" onClick={exportBookingsToCalendar} title="Export to Google Calendar">
              📅 Calendar
            </button>
            <button className="export-btn" onClick={exportBookingsToCSV} title="Export bookings to Excel">
              📊 Bookings CSV
            </button>
            <button className="export-btn" onClick={exportClientsToCSV} title="Export clients to Excel">
              👥 Clients CSV
            </button>
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
            className={`admin-tab ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            Clients {clientStats.expiring > 0 && <span className="tab-badge">{clientStats.expiring}</span>}
          </button>
          <button
            className={`admin-tab ${activeTab === 'blocked' ? 'active' : ''}`}
            onClick={() => setActiveTab('blocked')}
          >
            Block Slots
          </button>
          <button
            className={`admin-tab ${activeTab === 'slots' ? 'active' : ''}`}
            onClick={() => setActiveTab('slots')}
          >
            Manage Slots
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
              {slots.filter(s => s.is_active).map(slot => (
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
                      {slots.filter(s => s.is_active).map(slot => (
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

        {activeTab === 'slots' && (
          <>
            <div className="block-form">
              <h3 className="block-form-title">
                {editingSlot ? 'Edit Slot' : 'Add New Slot'}
              </h3>
              <form onSubmit={editingSlot ? handleUpdateSlot : handleAddSlot}>
                <div className="block-form-row">
                  <div className="block-form-group">
                    <label>Slot Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Morning"
                      value={slotForm.name}
                      onChange={e => setSlotForm({ ...slotForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="block-form-group">
                    <label>Start Time *</label>
                    <input
                      type="text"
                      placeholder="e.g., 7:00 AM"
                      value={slotForm.timeStart}
                      onChange={e => setSlotForm({ ...slotForm, timeStart: e.target.value })}
                      required
                    />
                  </div>
                  <div className="block-form-group">
                    <label>End Time *</label>
                    <input
                      type="text"
                      placeholder="e.g., 8:30 AM"
                      value={slotForm.timeEnd}
                      onChange={e => setSlotForm({ ...slotForm, timeEnd: e.target.value })}
                      required
                    />
                  </div>
                  <div className="block-form-group">
                    <label>Max Capacity</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={slotForm.maxCapacity}
                      onChange={e => setSlotForm({ ...slotForm, maxCapacity: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="block-form-btn" disabled={savingSlot}>
                    {savingSlot ? 'Saving...' : editingSlot ? 'Update' : 'Add Slot'}
                  </button>
                  {editingSlot && (
                    <button type="button" className="unblock-btn" onClick={cancelEditSlot} style={{ marginLeft: '8px' }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <h3 style={{ fontFamily: 'Oswald', marginBottom: '16px', textTransform: 'uppercase' }}>
              Current Slots
            </h3>

            {slots.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">&#128337;</div>
                <p className="empty-text">No slots configured</p>
              </div>
            ) : (
              <div className="slots-manage-list">
                {slots.map(slot => (
                  <div key={slot.id} className={`slot-manage-item ${!slot.is_active ? 'inactive' : ''}`}>
                    <div className="slot-manage-info">
                      <span className="slot-manage-name">{slot.name}</span>
                      <span className="slot-manage-time">{formatSlotTime(slot)}</span>
                      <span className="slot-manage-capacity">Max {slot.max_capacity} people</span>
                      {!slot.is_active && <span className="slot-manage-inactive">Inactive</span>}
                    </div>
                    <div className="slot-manage-actions">
                      <button
                        className="edit-btn"
                        onClick={() => startEditSlot(slot)}
                        title="Edit slot"
                      >
                        Edit
                      </button>
                      <button
                        className={slot.is_active ? 'disable-btn' : 'enable-btn'}
                        onClick={() => handleToggleSlot(slot.id, slot.is_active)}
                        title={slot.is_active ? 'Disable slot' : 'Enable slot'}
                      >
                        {slot.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteSlot(slot.id)}
                        title="Delete slot"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'clients' && (
          <>
            <div className="client-stats">
              <div className={`client-stat-box ${clientFilter === 'all' ? 'active' : ''}`} onClick={() => setClientFilter('all')}>
                <div className="client-stat-number">{clientStats.total}</div>
                <div className="client-stat-label">Total</div>
              </div>
              <div className={`client-stat-box ${clientFilter === 'active' ? 'active' : ''}`} onClick={() => setClientFilter('active')}>
                <div className="client-stat-number green">{clientStats.active}</div>
                <div className="client-stat-label">Active</div>
              </div>
              <div className={`client-stat-box ${clientFilter === 'expiring' ? 'active' : ''}`} onClick={() => setClientFilter('expiring')}>
                <div className="client-stat-number orange">{clientStats.expiring}</div>
                <div className="client-stat-label">Expiring Soon</div>
              </div>
              <div className={`client-stat-box ${clientFilter === 'expired' ? 'active' : ''}`} onClick={() => setClientFilter('expired')}>
                <div className="client-stat-number red">{clientStats.expired}</div>
                <div className="client-stat-label">Expired</div>
              </div>
            </div>

            <div className="block-form">
              <h3 className="block-form-title">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h3>
              <form onSubmit={editingClient ? handleUpdateClient : handleAddClient}>
                <div className="block-form-row">
                  <div className="block-form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      placeholder="Client name"
                      value={clientForm.name}
                      onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="block-form-group">
                    <label>Phone *</label>
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={clientForm.phone}
                      onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="block-form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={clientForm.email}
                      onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="block-form-row" style={{ marginTop: '16px' }}>
                  <div className="block-form-group">
                    <label>Plan *</label>
                    <select
                      value={clientForm.planType}
                      onChange={e => setClientForm({ ...clientForm, planType: e.target.value })}
                    >
                      {PLAN_TYPES.map(plan => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="block-form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={clientForm.startDate}
                      onChange={e => setClientForm({ ...clientForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="block-form-group" style={{ flex: 2 }}>
                    <label>Notes</label>
                    <input
                      type="text"
                      placeholder="Any notes about client"
                      value={clientForm.notes}
                      onChange={e => setClientForm({ ...clientForm, notes: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="block-form-btn" disabled={savingClient}>
                    {savingClient ? 'Saving...' : editingClient ? 'Update' : 'Add Client'}
                  </button>
                  {editingClient && (
                    <button type="button" className="unblock-btn" onClick={cancelEditClient} style={{ marginLeft: '8px' }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <h3 style={{ fontFamily: 'Oswald', marginBottom: '16px', textTransform: 'uppercase' }}>
              {clientFilter === 'all' ? 'All Clients' : clientFilter === 'active' ? 'Active Clients' : clientFilter === 'expiring' ? 'Expiring Soon' : 'Expired Memberships'}
              <span style={{ fontWeight: 'normal', fontSize: '0.9rem', marginLeft: '8px', color: 'var(--text-muted)' }}>
                ({filteredClients.length})
              </span>
            </h3>

            {filteredClients.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">&#128100;</div>
                <p className="empty-text">No clients found</p>
              </div>
            ) : (
              <div className="clients-list">
                {filteredClients.map(client => {
                  const status = getClientStatus(client.end_date)
                  const daysLeft = getDaysRemaining(client.end_date)

                  return (
                    <div key={client.id} className={`client-card ${status}`}>
                      <div className="client-status-indicator"></div>
                      <div className="client-info">
                        <div className="client-name">{client.name}</div>
                        <div className="client-contact">
                          <a href={`tel:${client.phone}`}>{client.phone}</a>
                          {client.email && <span> • <a href={`mailto:${client.email}`}>{client.email}</a></span>}
                        </div>
                        {client.notes && <div className="client-notes">"{client.notes}"</div>}
                      </div>
                      <div className="client-plan">
                        <div className="client-plan-name">{getPlanName(client.plan_type)}</div>
                        <div className="client-dates">
                          {formatDate(client.start_date)} - {formatDate(client.end_date)}
                        </div>
                      </div>
                      <div className="client-status">
                        {status === 'expired' ? (
                          <span className="days-badge expired">Expired {Math.abs(daysLeft)} days ago</span>
                        ) : status === 'expiring' ? (
                          <span className="days-badge expiring">{daysLeft} days left</span>
                        ) : (
                          <span className="days-badge active">{daysLeft} days left</span>
                        )}
                      </div>
                      <div className="client-actions">
                        {renewingClient === client.id ? (
                          <div className="renew-form">
                            <select
                              value={renewPlanType}
                              onChange={e => setRenewPlanType(e.target.value)}
                            >
                              {PLAN_TYPES.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.name}</option>
                              ))}
                            </select>
                            <button className="enable-btn" onClick={() => handleRenewClient(client.id)}>Confirm</button>
                            <button className="unblock-btn" onClick={() => setRenewingClient(null)}>Cancel</button>
                          </div>
                        ) : (
                          <>
                            <button className="history-btn" onClick={() => viewClientHistory(client)}>History</button>
                            <button className="renew-btn" onClick={() => setRenewingClient(client.id)}>Renew</button>
                            <button className="edit-btn" onClick={() => startEditClient(client)}>Edit</button>
                            <button className="delete-btn" onClick={() => handleDeleteClient(client.id)}>Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Booking History Modal */}
        {historyClient && (
          <div className="modal-overlay" onClick={closeHistoryModal}>
            <div className="modal history-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Booking History</h2>
                <button className="modal-close" onClick={closeHistoryModal}>×</button>
              </div>
              <div className="history-client-info">
                <span className="history-client-name">{historyClient.name}</span>
                <span className="history-client-phone">{historyClient.phone}</span>
              </div>

              {loadingHistory ? (
                <div className="loading">
                  <div className="loading-spinner"></div>
                </div>
              ) : clientHistory.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <div className="empty-icon">📋</div>
                  <p className="empty-text">No booking history found</p>
                </div>
              ) : (
                <>
                  <div className="history-stats">
                    <div className="history-stat">
                      <span className="history-stat-num">{clientHistory.length}</span>
                      <span className="history-stat-label">Total Bookings</span>
                    </div>
                    <div className="history-stat">
                      <span className="history-stat-num">
                        {clientHistory.filter(b => b.booking_date >= todayStr).length}
                      </span>
                      <span className="history-stat-label">Upcoming</span>
                    </div>
                    <div className="history-stat">
                      <span className="history-stat-num">
                        {clientHistory.filter(b => b.booking_date < todayStr).length}
                      </span>
                      <span className="history-stat-label">Past</span>
                    </div>
                  </div>

                  <div className="history-list">
                    {clientHistory.map(booking => (
                      <div
                        key={booking.id}
                        className={`history-item ${booking.booking_date < todayStr ? 'past' : 'upcoming'}`}
                      >
                        <div className="history-date">
                          <span className="history-date-day">{formatDate(booking.booking_date)}</span>
                          <span className={`history-badge ${booking.booking_date < todayStr ? 'past' : 'upcoming'}`}>
                            {booking.booking_date < todayStr ? 'Completed' : booking.booking_date === todayStr ? 'Today' : 'Upcoming'}
                          </span>
                        </div>
                        <div className="history-slot">
                          <span className="history-slot-name">{getSlotName(booking.slot_id)}</span>
                          <span className="history-slot-time">{getSlotTime(booking.slot_id)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="history-actions">
                    <button
                      className="export-btn"
                      onClick={() => exportClientHistoryToCalendar(clientHistory, historyClient)}
                    >
                      📅 Export to Calendar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrainerAdmin
