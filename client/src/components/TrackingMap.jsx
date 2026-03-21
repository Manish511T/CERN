import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import socket from "../socket/socket";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const victimIcon = L.divIcon({
  className: "",
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
});

const volunteerIcon = L.divIcon({
  className: "",
  html: `
    <div style="width:20px;height:20px;border-radius:50%;
      background:#2563eb;border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const getETA = (meters) => {
  const minutes = Math.round((meters / 1000 / 30) * 60);
  if (minutes < 1) return "< 1 min";
  return `~${minutes} min`;
};

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.panTo(center, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
};

const TrackingMap = ({
  sosId,
  role,
  victimLocation,
  victimId,
  volunteerName,
  onClose,
  onEndSession,
}) => {
  const [volunteerPos, setVolunteerPos] = useState(null);
  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('acquiring')
  // acquiring | active | low_accuracy
  const watchIdRef = useRef(null);
  const lastEmitTimeRef = useRef(0)

  const victimLatLng = victimLocation
    ? [victimLocation.latitude, victimLocation.longitude]
    : null;

  // VOLUNTEER: watch own GPS and broadcast to victim
  useEffect(() => {
    if (role !== 'volunteer') return

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }

    const broadcast = (pos) => {
      const { latitude, longitude, accuracy } = pos.coords
      const now = Date.now()

      // Adaptive accuracy threshold:
      // Accept any reading under 50m — good enough for emergency navigation
      // Show warning if over 50m but still use it so marker always moves
      if (accuracy > 50) {
        setGpsStatus('low_accuracy')
      } else {
        setGpsStatus('active')
      }

      // Throttle: emit maximum every 3 seconds
      if (now - lastEmitTimeRef.current < 3000) return
      lastEmitTimeRef.current = now

      setVolunteerPos([latitude, longitude])

      if (victimLocation) {
        const dist = getDistanceMeters(
          latitude, longitude,
          victimLocation.latitude, victimLocation.longitude
        )
        setDistance(dist)
        setEta(getETA(dist))
      }

      socket.emit('volunteer:location', {
        sosId,
        latitude,
        longitude,
        toUserId: victimId
      })
    }

    const onError = (err) => {
      console.error('GPS error:', err.message)
      setGpsStatus('acquiring')
    }

    Promise.resolve().then(() => setGpsStatus('acquiring'))
watchIdRef.current = navigator.geolocation.watchPosition(broadcast, onError, options)

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [role, sosId, victimId, victimLocation])

  // VICTIM: listen for volunteer location updates
  useEffect(() => {
    if (role !== 'victim') return

    socket.on('volunteer:location', ({ latitude, longitude }) => {
      setVolunteerPos([latitude, longitude])
      if (victimLocation) {
        const dist = getDistanceMeters(
          latitude, longitude,
          victimLocation.latitude, victimLocation.longitude
        )
        setDistance(dist)
        setEta(getETA(dist))
      }
    })

    return () => socket.off('volunteer:location')
  }, [role, victimLocation])

  const mapCenter = victimLatLng || [20.5937, 78.9629]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">

      {/* Top bar */}
      <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="font-bold text-sm">
            {role === 'volunteer' ? '🦺 Navigate to victim' : '🚨 Help is coming'}
          </p>
          <p className="text-red-200 text-xs">
            {role === 'victim'
              ? volunteerName ? `${volunteerName} is on the way` : 'Waiting for volunteer...'
              : victimLocation?.address || 'Navigating to victim'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="text-white bg-red-700 hover:bg-red-800 rounded-lg px-3 py-1 text-sm"
          >
            Minimise
          </button>
          {onEndSession && (
            <button
              onClick={onEndSession}
              className="text-red-200 hover:text-white rounded-lg px-3 py-1 text-sm border border-red-500"
            >
              End
            </button>
          )}
        </div>
      </div>

      {/* GPS status bar — only shown to volunteer */}
      {role === 'volunteer' && (
        <div className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 shrink-0 ${
          gpsStatus === 'active'
            ? 'bg-green-50 text-green-700'
            : gpsStatus === 'low_accuracy'
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-gray-50 text-gray-500'
        }`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            gpsStatus === 'active' ? 'bg-green-500 animate-pulse'
            : gpsStatus === 'low_accuracy' ? 'bg-yellow-500 animate-pulse'
            : 'bg-gray-400'
          }`} />
          {gpsStatus === 'active' && 'GPS active — location updating every 3s'}
          {gpsStatus === 'low_accuracy' && 'GPS signal weak — location may be less precise'}
          {gpsStatus === 'acquiring' && 'Acquiring GPS signal...'}
        </div>
      )}

      {/* Waiting message for victim before volunteer moves */}
      {role === 'victim' && !volunteerPos && (
        <div className="bg-blue-50 px-4 py-2 text-xs text-blue-600 flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
          Waiting for volunteer to share their location...
        </div>
      )}

      {/* ETA / distance bar — shows as soon as volunteerPos is known */}
      {distance !== null && (
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-6 shrink-0">
          <div className="text-center">
            <p className="text-xs text-gray-400">Distance</p>
            <p className="font-bold text-gray-800 text-sm">{formatDistance(distance)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">ETA</p>
            <p className="font-bold text-red-600 text-sm">{eta}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Status</p>
            <p className="font-bold text-green-600 text-sm">
              {role === 'volunteer' ? 'Responding' : 'En route'}
            </p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {victimLatLng && (
            <Marker position={victimLatLng} icon={victimIcon}>
              <Popup>
                <strong>🔴 Victim location</strong>
                {victimLocation?.address && <><br />{victimLocation.address}</>}
              </Popup>
            </Marker>
          )}

          {volunteerPos && (
            <Marker position={volunteerPos} icon={volunteerIcon}>
              <Popup>
                <strong>
                  🔵 {role === 'volunteer' ? 'You (volunteer)' : volunteerName || 'Volunteer'}
                </strong>
                <br />
                {role === 'victim' ? 'Moving towards you' : 'Your location'}
              </Popup>
            </Marker>
          )}

          {volunteerPos && victimLatLng && (
            <Polyline
              positions={[volunteerPos, victimLatLng]}
              color="#ef4444"
              weight={3}
              dashArray="8 6"
              opacity={0.8}
            />
          )}

          {volunteerPos && <MapUpdater center={volunteerPos} />}
        </MapContainer>
      </div>

      {/* Bottom legend */}
      <div className="bg-white border-t border-gray-100 px-4 py-2 flex gap-6 shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          Victim
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-3 h-3 rounded-full bg-blue-600" />
          Volunteer
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-6 border-t-2 border-dashed border-red-400" />
          Route
        </div>
      </div>
    </div>
  )
}

export default TrackingMap