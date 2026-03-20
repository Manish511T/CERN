import { useEffect } from 'react'
import api from '../api/axios'

const useLocationUpdater = (user) => {
  useEffect(() => {
    if (!user) return

    const updateLocation = (pos) => {
      api.post('/sos/location', {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      }).catch(err => console.error('Location update failed:', err))
    }

    if (!navigator.geolocation) return

    // Update immediately on load
    navigator.geolocation.getCurrentPosition(updateLocation, (err) => {
      console.warn('GPS error:', err.message)
    })

    // Then keep updating every 30 seconds so volunteer stays current
    const watchId = navigator.geolocation.watchPosition(
      updateLocation,
      (err) => console.warn('GPS watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 30000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [user])
}

export default useLocationUpdater