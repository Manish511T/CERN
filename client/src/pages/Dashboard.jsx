import { useAuth } from '../context/useAuth'
import { useNavigate } from 'react-router-dom'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <span className="text-red-600 font-bold text-lg">🚨 CERN</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Hello, <span className="font-medium">{user?.name}</span>
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            user?.role === 'volunteer'
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {user?.role}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main content — feature cards (shells for future phases) */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-500 text-sm mb-8">What do you need help with today?</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* SOS Card */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:shadow-md transition">
            <span className="text-4xl">🆘</span>
            <h3 className="font-semibold text-red-700">SOS Alert</h3>
            <p className="text-xs text-center text-red-500">Trigger an emergency alert for yourself or others</p>
            <span className="text-xs bg-red-100 text-red-400 px-3 py-1 rounded-full">Coming in Phase 2</span>
          </div>

          {/* AI Symptom Checker Card */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:shadow-md transition">
            <span className="text-4xl">🩺</span>
            <h3 className="font-semibold text-blue-700">Symptom Checker</h3>
            <p className="text-xs text-center text-blue-500">AI-guided triage for your symptoms</p>
            <span className="text-xs bg-blue-100 text-blue-400 px-3 py-1 rounded-full">Coming in Phase 3</span>
          </div>

          {/* Patient Records Card */}
          <div className="bg-green-50 border border-green-100 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:shadow-md transition">
            <span className="text-4xl">📋</span>
            <h3 className="font-semibold text-green-700">Health Records</h3>
            <p className="text-xs text-center text-green-500">Store and share your medical records securely</p>
            <span className="text-xs bg-green-100 text-green-400 px-3 py-1 rounded-full">Coming in Phase 4</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard