import axios from 'axios'
import { User } from '../stores/authStore'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api/auth',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error)
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface LoginCredentials {
  email?: string
  employeeId?: string
  password: string
}

export interface RegisterData {
  employeeId: string
  email: string
  password: string
  firstName: string
  lastName: string
  department: string
  designation: string
  role?: 'student' | 'mentor'
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    user: User
    token: string
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
}

export const authService = {
  // Login user
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post('/login', credentials)
    return response.data
  },

  // Register new user
  register: async (userData: RegisterData): Promise<LoginResponse> => {
    const response = await api.post('/register', userData)
    return response.data
  },

  // Get current user profile
  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get('/me')
    return response.data
  },

  // Update user profile
  updateProfile: async (updates: Partial<User>): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.put('/profile', updates)
    return response.data
  },

  // Change password
  changePassword: async (data: {
    currentPassword: string
    newPassword: string
  }): Promise<ApiResponse> => {
    const response = await api.post('/change-password', data)
    return response.data
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const response = await api.post('/forgot-password', { email })
    return response.data
  },

  // Reset password
  resetPassword: async (data: {
    token: string
    newPassword: string
  }): Promise<ApiResponse> => {
    const response = await api.post('/reset-password', data)
    return response.data
  },

  // Refresh JWT token
  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    const response = await api.post('/refresh')
    return response.data
  },

  // Logout user
  logout: async (): Promise<ApiResponse> => {
    const response = await api.post('/logout')
    return response.data
  },

  // Verify if user is authenticated
  verifyAuth: async (): Promise<boolean> => {
    try {
      await api.get('/me')
      return true
    } catch (error) {
      return false
    }
  },

  // Upload profile picture
  uploadProfilePicture: async (file: File): Promise<ApiResponse<{ profilePicture: string }>> => {
    const formData = new FormData()
    formData.append('profilePicture', file)
    
    const response = await api.post('/upload-profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Update learning preferences
  updatePreferences: async (preferences: User['preferences']): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.put('/profile', { preferences })
    return response.data
  },

  // Add learning goal
  addLearningGoal: async (goal: {
    goal: string
    targetDate: string
  }): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.post('/learning-goals', goal)
    return response.data
  },

  // Update learning goal progress
  updateLearningGoalProgress: async (goalId: string, progress: number): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.put(`/learning-goals/${goalId}`, { progress })
    return response.data
  },

  // Get user statistics
  getUserStats: async (): Promise<ApiResponse<{
    totalSessions: number
    completedModules: number
    totalLearningTime: number
    averageScore: number
    badges: number
    currentStreak: number
  }>> => {
    const response = await api.get('/stats')
    return response.data
  },
}

export default authService