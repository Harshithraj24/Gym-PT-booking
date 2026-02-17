import { useState } from 'react'

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (!password) {
      setError(true)
      return
    }

    setLoading(true)
    setError(false)

    try {
      const response = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (data.success) {
        sessionStorage.setItem('admin_authenticated', 'true')
        onLogin()
      } else {
        setError(true)
        setPassword('')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(true)
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-title-section">
        <h1 className="page-title">Trainer Login</h1>
        <p className="page-subtitle">Enter password to access dashboard</p>
      </div>

      <div className="container" style={{ maxWidth: '400px', marginTop: '40px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter admin password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                setError(false)
              }}
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div className="toast error" style={{ position: 'relative', marginBottom: '16px' }}>
              Incorrect password
            </div>
          )}

          <button type="submit" className="book-btn" disabled={loading}>
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin
