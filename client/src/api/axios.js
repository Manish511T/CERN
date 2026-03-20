import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh when token expires
let isRefreshing = false
let failedQueue = []  // hold requests that came in while refreshing

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,  // success — pass through
  async (error) => {
    const originalRequest = error.config

    // Only handle 401 errors, and don't retry refresh calls themselves
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Another refresh is already in progress — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Call refresh endpoint — sends httpOnly cookie automatically
        const res = await api.post('/auth/refresh')
        const newToken = res.data.accessToken

        localStorage.setItem('accessToken', newToken)
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        processQueue(null, newToken)

        // Retry the original failed request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)

      } catch (refreshError) {
        // Refresh failed — token truly expired, log user out
        processQueue(refreshError, null)
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api