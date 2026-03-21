import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const victimIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:24px;height:24px">
      <div style="position:absolute;width:24px;height:24px;border-radius:50%;
        background:rgba(239,68,68,0.3);animation:ping 1.2s ease-out infinite;"></div>
      <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;
        border-radius:50%;background:#ef4444;border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
    </div>
    <style>@keyframes ping{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.5);opacity:0}}</style>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const FitMap = ({ position }) => {
  const map = useMap()
  useEffect(() => {
    if (position) map.setView(position, 16)
  }, [position, map])
  return null
}

const UserAlertMap = ({ alert, onClose }) => {
  if (!alert?.location?.coordinates) return null

  const lat = alert.location.coordinates[1]
  const lng = alert.location.coordinates[0]
  const victimLatLng = [lat, lng]

  const getEmergencyLabel = (type) => ({
    accident:   '🚗 Road Accident',
    cardiac:    '❤️ Cardiac Arrest',
    snake_bite: '🐍 Snake Bite',
    rabies:     '⚠️ Rabies',
    other:      '🆘 Emergency'
  }[type] || '🆘 Emergency')

  const openGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
      '_blank'
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">

      {/* Top bar */}
      <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="font-bold text-sm">
            {getEmergencyLabel(alert.emergencyType)}
          </p>
          <p className="text-red-200 text-xs">
            Someone nearby needs help — within 500m of you
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-white bg-red-700 hover:bg-red-800 rounded-lg px-3 py-1 text-sm"
        >
          Close
        </button>
      </div>

      {/* Info bar */}
      <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
        <p className="text-xs text-red-700 font-medium">
          Red marker shows victim's exact location. Tap "Get Directions" to navigate.
        </p>
      </div>

      {/* Photo if available */}
      {alert.photoUrl && (
        <div className="px-4 pt-3 shrink-0">
          <img
            src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${alert.photoUrl}`}
            alt="Emergency"
            className="w-full h-32 object-cover rounded-xl"
          />
        </div>
      )}

      {/* Map — fills remaining space */}
      <div className="flex-1">
        <MapContainer
          center={victimLatLng}
          zoom={16}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={victimLatLng} icon={victimIcon}>
            <Popup>
              <strong>🔴 Person needs help</strong>
              {alert.location?.address && <><br />{alert.location.address}</>}
            </Popup>
          </Marker>
          <FitMap position={victimLatLng} />
        </MapContainer>
      </div>

      {/* Bottom action buttons */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex gap-3 shrink-0">
        <button
          onClick={openGoogleMaps}
          className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-red-700 transition flex items-center justify-center gap-2"
        >
          🗺️ Get Directions
        </button>
        <button
          onClick={onClose}
          className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export default UserAlertMap