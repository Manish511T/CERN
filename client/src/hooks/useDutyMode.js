import { useState, useEffect } from 'react'
import api from '../api/axios'

const useDutyMode = (user) => {
  const [isOnDuty, setIsOnDuty] = useState(false)
  const [toggling, setToggling] = useState(false)

  // Load initial duty status from user object
  useEffect(() => {
    if (user?.isOnDuty !== undefined) {
      setIsOnDuty(user.isOnDuty)
    }
  }, [user])

  const toggleDuty = async () => {
    setToggling(true)
    try {
      const res = await api.patch('/auth/duty')
      setIsOnDuty(res.data.isOnDuty)
      return res.data.isOnDuty
    } catch (err) {
      console.error('Duty toggle failed:', err)
      return isOnDuty
    } finally {
      setToggling(false)
    }
  }

  return { isOnDuty, toggling, toggleDuty }
}

export default useDutyMode