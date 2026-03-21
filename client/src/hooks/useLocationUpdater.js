import { useEffect } from 'react'
import api from '../api/axios'

const useLocationUpdater = (user, isOnDuty) => {
  useEffect(() => {
    if (!user) return

    // Users always update location (needed for SOS trigger)
    // Volunteers only update when on duty
    if (user.role === 'volunteer' && !isOnDuty) return

    const updateLocation = (pos) => {
      api.post('/sos/location', {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      }).catch(err => console.error('Location update failed:', err))
    }

    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(updateLocation, (err) => {
      console.warn('GPS error:', err.message)
    })

    const watchId = navigator.geolocation.watchPosition(
      updateLocation,
      (err) => console.warn('GPS watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 30000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [user, isOnDuty])
}

export default useLocationUpdater