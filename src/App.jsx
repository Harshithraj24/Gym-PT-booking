import { Routes, Route, Link, useLocation } from 'react-router-dom'
import ClientBooking from './components/ClientBooking'
import TrainerAdmin from './components/TrainerAdmin'
import CancelBooking from './components/CancelBooking'

function App() {
  const location = useLocation()
  const isAdmin = location.pathname === '/admin'
  const isCancelPage = location.pathname.startsWith('/cancel')

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            FIT<span>2</span>FLY
            <div className="trainer-name">by Murali</div>
          </Link>
          {!isCancelPage && (
            <Link
              to={isAdmin ? '/' : '/admin'}
              className="nav-link"
            >
              {isAdmin ? 'Book Slot' : 'Trainer View'}
            </Link>
          )}
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<ClientBooking />} />
          <Route path="/admin" element={<TrainerAdmin />} />
          <Route path="/cancel/:token" element={<CancelBooking />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
