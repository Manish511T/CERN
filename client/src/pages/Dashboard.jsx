import { useAuth } from '../context/useAuth'
import { useNavigate } from 'react-router-dom'
import useLocationUpdater from '../hooks/useLocationUpdater'
import useDutyMode from '../hooks/useDutyMode'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isOnDuty, toggling, toggleDuty } = useDutyMode(user)

  // Pass isOnDuty so location only tracks when volunteer is on duty
  useLocationUpdater(user, isOnDuty)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleDutyToggle = async () => {
    const newStatus = await toggleDuty()
    // No need to do anything else — isOnDuty state updates automatically
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-500 text-sm mb-8">What do you need help with today?</p>

        {/* Duty Mode Toggle — volunteers only */}
        {user?.role === 'volunteer' && (
          <div className={`rounded-2xl p-5 mb-6 border-2 transition-all ${
            isOnDuty
              ? 'bg-green-50 border-green-400'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Status indicator dot */}
                <div className={`w-4 h-4 rounded-full shrink-0 ${
                  isOnDuty ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                }`} />
                <div>
                  <p className={`font-bold text-base ${
                    isOnDuty ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {isOnDuty ? 'On Duty' : 'Off Duty'}
                  </p>
                  <p className={`text-xs ${
                    isOnDuty ? 'text-green-500' : 'text-gray-400'
                  }`}>
                    {isOnDuty
                      ? 'You are visible to patients and receiving SOS alerts'
                      : 'You are invisible — no SOS alerts will be sent to you'}
                  </p>
                </div>
              </div>

              {/* Toggle button */}
              <button
                onClick={handleDutyToggle}
                disabled={toggling}
                className={`relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none disabled:opacity-50 ${
                  isOnDuty ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all duration-300 ${
                  isOnDuty ? 'left-9' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Extra info when on duty */}
            {isOnDuty && (
              <div className="mt-3 pt-3 border-t border-green-200 flex items-center gap-2">
                <span className="text-green-600 text-xs">
                  📍 Your live location is being shared within 5km radius
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/sos')}
            className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:shadow-md hover:border-red-400 transition"
          >
            <span className="text-4xl">🆘</span>
            <h3 className="font-semibold text-red-700">SOS Alert</h3>
            <p className="text-xs text-center text-red-500">
              Trigger an emergency alert for yourself or others
            </p>
            <span className="text-xs bg-red-600 text-white px-3 py-1 rounded-full">
              Tap to activate
            </span>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:shadow-md transition">
            <span className="text-4xl">🩺</span>
            <h3 className="font-semibold text-blue-700">Symptom Checker</h3>
            <p className="text-xs text-center text-blue-500">
              AI-guided triage for your symptoms
            </p>
            <span className="text-xs bg-blue-100 text-blue-400 px-3 py-1 rounded-full">
              Coming in Phase 3
            </span>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:shadow-md transition">
            <span className="text-4xl">📋</span>
            <h3 className="font-semibold text-green-700">Health Records</h3>
            <p className="text-xs text-center text-green-500">
              Store and share your medical records securely
            </p>
            <span className="text-xs bg-green-100 text-green-400 px-3 py-1 rounded-full">
              Coming in Phase 4
            </span>
          </div>
        </div>

        {/* SOS History button — volunteers only */}
        {user?.role === 'volunteer' && (
          <button
            onClick={() => navigate('/volunteer/history')}
            className="mt-6 w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:border-gray-300 hover:shadow-sm transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div className="text-left">
                <p className="font-semibold text-gray-700 text-sm">SOS History</p>
                <p className="text-gray-400 text-xs">Manage and resolve past alerts</p>
              </div>
            </div>
            <span className="text-gray-300 text-lg">→</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default Dashboard