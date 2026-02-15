import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using mock mode.')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const SLOTS = [
  { id: 'early_morning', name: 'Early Morning', time: '5:30 AM - 7:00 AM' },
  { id: 'morning', name: 'Morning', time: '7:00 AM - 8:30 AM' },
  { id: 'evening', name: 'Evening', time: '5:00 PM - 6:30 PM' },
  { id: 'late_evening', name: 'Late Evening', time: '7:00 PM - 8:30 PM' },
]

export const MAX_BOOKINGS_PER_SLOT = 3

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Booking functions
export async function getBookingsForDay(day) {
  if (!supabase) {
    // Mock data for development
    return []
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('day', day)

  if (error) {
    console.error('Error fetching bookings:', error)
    return []
  }

  return data || []
}

export async function getSlotCounts(day) {
  if (!supabase) {
    return {}
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('slot_id')
    .eq('day', day)

  if (error) {
    console.error('Error fetching slot counts:', error)
    return {}
  }

  const counts = {}
  SLOTS.forEach(slot => {
    counts[slot.id] = data?.filter(b => b.slot_id === slot.id).length || 0
  })

  return counts
}

export async function createBooking(day, slotId, clientName, clientPhone) {
  if (!supabase) {
    console.warn('Supabase not configured. Booking not saved.')
    return { success: false, error: 'Database not configured' }
  }

  // Check current count
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('day', day)
    .eq('slot_id', slotId)

  if (existing && existing.length >= MAX_BOOKINGS_PER_SLOT) {
    return { success: false, error: 'Slot is full' }
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([
      {
        day,
        slot_id: slotId,
        client_name: clientName,
        client_phone: clientPhone,
        booked_at: new Date().toISOString()
      }
    ])
    .select()

  if (error) {
    console.error('Error creating booking:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

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

export async function getAllBookings() {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('day', { ascending: true })
    .order('slot_id', { ascending: true })

  if (error) {
    console.error('Error fetching all bookings:', error)
    return []
  }

  return data || []
}
