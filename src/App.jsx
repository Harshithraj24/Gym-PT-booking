import { Routes, Route, Link, useLocation } from 'react-router-dom'
import ClientBooking from './components/ClientBooking'
import TrainerAdmin from './components/TrainerAdmin'

function App() {
  const location = useLocation()
  const isAdmin = location.pathname === '/admin'

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            FIT<span>2</span>FLY
            <div className="trainer-name">by Murali</div>
          </Link>
          <Link
            to={isAdmin ? '/' : '/admin'}
            className="nav-link"
          >
            {isAdmin ? 'Book Slot' : 'Trainer View'}
          </Link>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<ClientBooking />} />
          <Route path="/admin" element={<TrainerAdmin />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
