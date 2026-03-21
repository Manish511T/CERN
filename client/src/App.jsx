import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { TrackingProvider } from './context/TrackingProvider'
import ProtectedRoute from './components/ProtectedRoute'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SOSPage from './pages/SOSPage'
import VolunteerHistory from './pages/VolunteerHistory'
import ActiveTrackingBanner from './components/ActiveTrackingBanner'
import AlertBanner from './components/AlertBanner'

const App = () => {
  return (
    <AuthProvider>
      <TrackingProvider>
        <BrowserRouter>
          {/* These float above ALL pages — no matter which route is active */}
          <AlertBanner />
          <ActiveTrackingBanner />

          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/sos" element={<ProtectedRoute><SOSPage /></ProtectedRoute>} />
            <Route path="/volunteer/history" element={<ProtectedRoute><VolunteerHistory /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </TrackingProvider>
    </AuthProvider>
  )
}

export default App