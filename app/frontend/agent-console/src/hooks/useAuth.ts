import { useState, useEffect } from 'react'
import { apiClient, LoginRequest } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string
  role: string
  tenant_id: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('user_data')
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setIsAuthenticated(true)
        apiClient.setTenantId(parsedUser.tenant_id)
      } catch (err) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
      }
    }
    
    setIsLoading(false)
  }, [])

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.login(credentials)
      setUser(response.user)
      setIsAuthenticated(true)
      localStorage.setItem('user_data', JSON.stringify(response.user))
      setIsLoading(false)
    } catch (error: any) {
      setError(error.response?.data?.message || 'Login failed')
      setIsLoading(false)
      throw error
    }
  }

  const logout = () => {
    apiClient.logout()
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('user_data')
  }

  const clearError = () => {
    setError(null)
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
  }
}
