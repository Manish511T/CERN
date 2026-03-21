import { useState } from 'react'
import { TrackingContext } from './TrackingContext'

export const TrackingProvider = ({ children }) => {
  const [activeTracking, setActiveTracking] = useState(null)
  // activeTracking shape:
  // { sosId, role, victimLocation, victimId, volunteerName, volunteerId }

  const startTracking = (data) => setActiveTracking(data)
  const stopTracking = () => setActiveTracking(null)

  return (
    <TrackingContext.Provider value={{ activeTracking, startTracking, stopTracking }}>
      {children}
    </TrackingContext.Provider>
  )
}