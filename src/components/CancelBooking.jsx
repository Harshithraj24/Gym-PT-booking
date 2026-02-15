import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { cancelBookingByToken } from '../lib/supabase'

function CancelBooking() {
  const { token } = useParams()
  const [status, setStatus] = useState('confirming') // confirming, cancelling, success, error
  const [error, setError] = useState(null)

  async function handleCancel() {
    setStatus('cancelling')
    const result = await cancelBookingByToken(token)

    if (result.success) {
      setStatus('success')
    } else {
      setError(result.error)
      setStatus('error')
    }
  }

  return (
    <div>
      <div className="page-title-section">
        <h1 className="page-title">Cancel Booking</h1>
        <p className="page-subtitle">FIT2FLY by Murali</p>
      </div>

      <div className="container" style={{ maxWidth: '500px', marginTop: '40px' }}>
        <div className="modal" style={{ position: 'relative', maxWidth: '100%' }}>
          {status === 'confirming' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
                <h2 className="modal-title">Cancel Your Booking?</h2>
                <p className="modal-subtitle" style={{ marginBottom: 0 }}>
                  Are you sure you want to cancel this gym slot? This action cannot be undone.
                </p>
              </div>

              <div className="modal-actions">
                <Link to="/" className="btn-cancel" style={{ textAlign: 'center', textDecoration: 'none' }}>
                  Keep Booking
                </Link>
                <button className="btn-confirm" onClick={handleCancel}>
                  Yes, Cancel
                </button>
              </div>
            </>
          )}

          {status === 'cancelling' && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
              <p style={{ color: 'var(--text-secondary)' }}>Cancelling your booking...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="success-message">
              <div className="success-icon">✓</div>
              <h3 className="success-text">Booking Cancelled</h3>
              <p className="success-details" style={{ marginBottom: '24px' }}>
                Your gym slot has been cancelled successfully.
              </p>
              <Link to="/" className="book-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                Book Another Slot
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
              <h3 style={{ color: 'var(--danger)', marginBottom: '8px', fontFamily: 'Oswald', textTransform: 'uppercase' }}>
                Cancellation Failed
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                {error || 'This booking may have already been cancelled or does not exist.'}
              </p>
              <Link to="/" className="book-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                Go to Booking Page
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CancelBooking
