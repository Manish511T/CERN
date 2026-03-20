import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const STATUS_STYLES = {
  active:    'bg-red-100 text-red-700',
  accepted:  'bg-blue-100 text-blue-700',
  resolved:  'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500'
}

const TYPE_LABELS = {
  accident:   '🚗 Road Accident',
  cardiac:    '❤️ Cardiac Arrest',
  snake_bite: '🐍 Snake Bite',
  rabies:     '⚠️ Rabies',
  other:      '🆘 Emergency'
}

const VolunteerHistory = () => {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const fetchHistory = async () => {
    try {
      const res = await api.get('/sos/history')
      setHistory(res.data)
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [])

  const updateStatus = async (sosId, status) => {
    setUpdating(sosId)
    try {
      await api.patch(`/sos/status/${sosId}`, { status })
      // Update locally without refetch
      setHistory(prev =>
        prev.map(s => s._id === sosId ? { ...s, status } : s)
      )
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600">
          ← Back
        </button>
        <span className="font-bold text-gray-800 text-lg">📋 SOS History</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-gray-400 py-10">Loading...</p>
        ) : history.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p>No SOS history yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map(sos => (
              <div key={sos._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {TYPE_LABELS[sos.emergencyType] || '🆘 Emergency'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatTime(sos.createdAt)}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${STATUS_STYLES[sos.status]}`}>
                    {sos.status}
                  </span>
                </div>

                {/* Patient info */}
                <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3 text-xs text-gray-600 space-y-1">
                  <p>👤 Patient: <span className="font-medium">{sos.triggeredBy?.name || 'Unknown'}</span></p>
                  {sos.triggeredBy?.phone && <p>📞 {sos.triggeredBy.phone}</p>}
                  {sos.location?.address && <p>📍 {sos.location.address}</p>}
                  {sos.acceptedBy && (
                    <p>🦺 Accepted by: <span className="font-medium">{sos.acceptedBy?.name}</span></p>
                  )}
                </div>

                {/* Photo if exists */}
                {sos.photoUrl && (
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${sos.photoUrl}`}
                    alt="Emergency"
                    className="w-full h-32 object-cover rounded-xl mb-3"
                  />
                )}

                {/* Action buttons — only for active or accepted */}
                {(sos.status === 'active' || sos.status === 'accepted') && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => updateStatus(sos._id, 'resolved')}
                      disabled={updating === sos._id}
                      className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      ✅ Mark Resolved
                    </button>
                    <button
                      onClick={() => updateStatus(sos._id, 'cancelled')}
                      disabled={updating === sos._id}
                      className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default VolunteerHistory