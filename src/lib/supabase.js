import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using mock mode.')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Default slots (fallback if database is empty)
export const DEFAULT_SLOTS = [
  { id: 'early_morning', name: 'Early Morning', time_start: '5:30 AM', time_end: '7:00 AM', max_capacity: 3 },
  { id: 'morning', name: 'Morning', time_start: '7:00 AM', time_end: '8:30 AM', max_capacity: 3 },
  { id: 'evening', name: 'Evening', time_start: '5:00 PM', time_end: '6:30 PM', max_capacity: 3 },
  { id: 'late_evening', name: 'Late Evening', time_start: '7:00 PM', time_end: '8:30 PM', max_capacity: 3 },
]

// Legacy export for backwards compatibility
export const SLOTS = DEFAULT_SLOTS.map(s => ({
  id: s.id,
  name: s.name,
  time: `${s.time_start} - ${s.time_end}`
}))

export const MAX_BOOKINGS_PER_SLOT = 3
export const BOOKING_WINDOW_DAYS = 14

// Helper to get dates for next N days
export function getNextDates(days = BOOKING_WINDOW_DAYS) {
  const dates = []
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push({
      date: date.toISOString().split('T')[0], // YYYY-MM-DD
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      isToday: i === 0
    })
  }

  return dates
}

// Format date for display
export function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

// Get bookings for a specific date
export async function getBookingsForDate(bookingDate) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_date', bookingDate)

  if (error) {
    console.error('Error fetching bookings:', error)
    return []
  }

  return data || []
}

// Get slot counts for a specific date
export async function getSlotCounts(bookingDate, slots = null) {
  if (!supabase) return {}

  const { data, error } = await supabase
    .from('bookings')
    .select('slot_id')
    .eq('booking_date', bookingDate)

  if (error) {
    console.error('Error fetching slot counts:', error)
    return {}
  }

  // Count bookings per slot_id
  const counts = {}
  if (data) {
    data.forEach(b => {
      counts[b.slot_id] = (counts[b.slot_id] || 0) + 1
    })
  }

  return counts
}

// Get blocked slots for a date
export async function getBlockedSlots(bookingDate) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('blocked_slots')
    .select('*')
    .eq('blocked_date', bookingDate)

  if (error) {
    console.error('Error fetching blocked slots:', error)
    return []
  }

  return data || []
}

// Check if a slot is blocked
export async function isSlotBlocked(bookingDate, slotId) {
  const blocked = await getBlockedSlots(bookingDate)
  return blocked.some(b => b.slot_id === null || b.slot_id === slotId)
}

// Send confirmation email
async function sendConfirmationEmail(clientName, clientEmail, clientPhone, date, slotId, cancelToken) {
  if (!clientEmail) return

  // Fetch slot from database
  const slots = await getSlots()
  const slot = slots.find(s => s.id === slotId)
  const formattedDate = formatDate(date)

  try {
    await fetch('/api/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName,
        clientEmail,
        clientPhone,
        date: formattedDate,
        slotName: slot?.name || slotId,
        slotTime: slot ? formatSlotTime(slot) : '',
        cancelToken,
        siteUrl: window.location.origin
      })
    })
  } catch (err) {
    console.error('Failed to send confirmation email:', err)
  }
}

// Create a booking
export async function createBooking(bookingDate, slotId, clientName, clientPhone, clientEmail) {
  if (!supabase) {
    return { success: false, error: 'Database not configured' }
  }

  // Check if slot is blocked
  const blocked = await getBlockedSlots(bookingDate)
  const isBlocked = blocked.some(b => b.slot_id === null || b.slot_id === slotId)
  if (isBlocked) {
    return { success: false, error: 'This slot is not available' }
  }

  // Check current count
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('booking_date', bookingDate)
    .eq('slot_id', slotId)

  if (existing && existing.length >= MAX_BOOKINGS_PER_SLOT) {
    return { success: false, error: 'Slot is full' }
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([
      {
        booking_date: bookingDate,
        day: new Date(bookingDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
        slot_id: slotId,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail || null,
        booked_at: new Date().toISOString()
      }
    ])
    .select()

  if (error) {
    console.error('Error creating booking:', error)
    return { success: false, error: error.message }
  }

  // Send confirmation email (don't wait for it)
  const booking = data[0]
  sendConfirmationEmail(clientName, clientEmail, clientPhone, bookingDate, slotId, booking.cancel_token)

  return { success: true, data: booking }
}

// Delete a booking
export async function deleteBooking(id) {
  if (!supabase) {
    return { success: false, error: 'Database not configured' }
  }

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting booking:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Cancel booking by token (for client self-cancellation)
export async function cancelBookingByToken(token) {
  if (!supabase) {
    return { success: false, error: 'Database not configured' }
  }

  const { data, error } = await supabase
    .from('bookings')
    .delete()
    .eq('cancel_token', token)
    .select()

  if (error) {
    console.error('Error cancelling booking:', error)
    return { success: false, error: error.message }
  }

  if (!data || data.length === 0) {
    return { success: false, error: 'Booking not found or already cancelled' }
  }

  return { success: true }
}

// Get all bookings (for admin)
export async function getAllBookings() {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('booking_date', { ascending: true })
    .order('slot_id', { ascending: true })

  if (error) {
    console.error('Error fetching all bookings:', error)
    return []
  }

  return data || []
}

// Block a slot (admin)
export async function blockSlot(blockedDate, slotId = null, reason = '') {
  if (!supabase) {
    return { success: false, error: 'Database not configured' }
  }

  const { data, error } = await supabase
    .from('blocked_slots')
    .insert([{ blocked_date: blockedDate, slot_id: slotId, reason }])
    .select()

  if (error) {
    console.error('Error blocking slot:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data[0] }
}

// Unblock a slot (admin)
export async function unblockSlot(id) {
  if (!supabase) {
    return { success: false, error: 'Database not configured' }
  }

  const { error } = await supabase
    .from('blocked_slots')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error unblocking slot:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Get all blocked slots (admin)
export async function getAllBlockedSlots() {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('blocked_slots')
    .select('*')
    .order('blocked_date', { ascending: true })

  if (error) {
    console.error('Error fetching blocked slots:', error)
    return []
  }

  return data || []
}

// Get bookings for date range (admin)
export async function getBookingsInRange(startDate, endDate) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .order('booking_date', { ascending: true })

  if (error) {
    console.error('Error fetching bookings in range:', error)
    return []
  }

  return data || []
}

// ============ SLOT MANAGEMENT ============

// Get all slots from database
export async function getSlots() {
  if (!supabase) return DEFAULT_SLOTS

  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching slots:', error)
    return DEFAULT_SLOTS
  }

  return data && data.length > 0 ? data : DEFAULT_SLOTS
}

// Get all slots including inactive (admin)
export async function getAllSlots() {
  if (!supabase) return DEFAULT_SLOTS

  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching all slots:', error)
    return DEFAULT_SLOTS
  }

  return data || []
}

// Create a new slot
export async function createSlot(name, timeStart, timeEnd, maxCapacity = 3) {
  if (!supabase) {
    return { success: false, error: 'Database not configured' }
  }

  // Get max sort_order
  const { data: existing } = await supabase
    .from('slots')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1

  const { data, error } = await supabase
    .from('slots')
    .insert([{
      name,
      time_start: timeStart,
      time_end: timeEnd,
      max_capacity: maxCapacity,
      sort_order: nextOrder,
      is_active: true
    }])
    .select()

  if (error) {
    console.error('Error creating slot:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data[0] }
}

// Update a slot
export async function updateSlot(id, updates) {
  if (!supabase) {
    return { success: false, error: 'Database not configured' }
  }

  const { data, error } = await supabase
    .from('slots')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Error updating slot:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data[0] }
}

// Delete a slot
export async function deleteSlot(id) {
  if (!supabase) {
    return { success: false, error: 'Database not configured' }
  }

  const { error } = await supabase
    .from('slots')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting slot:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Toggle slot active status
export async function toggleSlotActive(id, isActive) {
  return updateSlot(id, { is_active: isActive })
}

// Reorder slots
export async function reorderSlots(slotIds) {
  if (!supabase) {
    return { success: false, error: 'Database not configured' }
  }

  const updates = slotIds.map((id, index) =>
    supabase.from('slots').update({ sort_order: index + 1 }).eq('id', id)
  )

  try {
    await Promise.all(updates)
    return { success: true }
  } catch (error) {
    console.error('Error reordering slots:', error)
    return { success: false, error: error.message }
  }
}

// Helper to format slot time
export function formatSlotTime(slot) {
  return `${slot.time_start} - ${slot.time_end}`
}
