import { useState } from 'react'
import { useTracking } from '../context/useTracking'
import TrackingMap from './TrackingMap'

const ActiveTrackingBanner = () => {
  const { activeTracking, stopTracking } = useTracking()
  const [mapOpen, setMapOpen] = useState(false)

  if (!activeTracking) return null

  return (
    <>
      {/* Floating pill — always visible when tracking is active */}
      {!mapOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => setMapOpen(true)}
            className="flex items-center gap-3 bg-red-600 text-white px-5 py-3 rounded-full shadow-2xl hover:bg-red-700 transition active:scale-95"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="font-semibold text-sm">
              {activeTracking.role === 'volunteer'
                ? '🗺️ Tap to navigate to victim'
                : '🗺️ Tap to track your rescuer'}
            </span>
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              LIVE
            </span>
          </button>
        </div>
      )}

      {/* Full screen map — re-opens on tap */}
      {mapOpen && (
        <TrackingMap
          sosId={activeTracking.sosId}
          role={activeTracking.role}
          victimLocation={activeTracking.victimLocation}
          victimId={activeTracking.victimId}
          volunteerName={activeTracking.volunteerName}
          onClose={() => setMapOpen(false)}  // close map but keep session alive
          onEndSession={() => {
            setMapOpen(false)
            stopTracking()              // fully end the tracking session
          }}
        />
      )}
    </>
  )
}

export default ActiveTrackingBanner