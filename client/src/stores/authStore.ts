import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authService } from '../services/authService'

export interface User {
  _id: string
  employeeId: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  department: string
  designation: string
  role: 'student' | 'mentor' | 'admin' | 'super_admin'
  profilePicture?: string
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
  interests: string[]
  completedModules: Array<{
    moduleId: string
    completedAt: string
    score: number
    timeSpent: number
  }>
  badges: Array<{
    name: string
    description: string
    earnedDate: string
    badgeUrl?: string
  }>
  totalLearningTime: number
  preferences: {
    emailNotifications: boolean
    pushNotifications: boolean
    preferredLanguage: string
    timezone: string
    learningReminders: boolean
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  login: (credentials: { email?: string; employeeId?: string; password: string }) => Promise<void>
  logout: () => void
  updateProfile: (updates: Partial<User>) => Promise<void>
  refreshToken: () => Promise<void>
  setUser: (user: User) => void
  setToken: (token: string) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true })
        try {
          const response = await authService.login(credentials)
          const { user, token } = response.data
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        })
        // Clear token from localStorage
        localStorage.removeItem('auth-storage')
      },

      updateProfile: async (updates) => {
        const currentUser = get().user
        if (!currentUser) throw new Error('No user logged in')

        try {
          const response = await authService.updateProfile(updates)
          const updatedUser = response.data.user
          
          set({ user: updatedUser })
        } catch (error) {
          throw error
        }
      },

      refreshToken: async () => {
        try {
          const response = await authService.refreshToken()
          const { token } = response.data
          
          set({ token })
        } catch (error) {
          // If refresh fails, logout user
          get().logout()
          throw error
        }
      },

      setUser: (user) => set({ user, isAuthenticated: true }),
      setToken: (token) => set({ token }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
)

// Utility functions
export const useIsRole = (role: string | string[]) => {
  const { user } = useAuthStore()
  if (!user) return false
  
  if (Array.isArray(role)) {
    return role.includes(user.role)
  }
  
  return user.role === role
}

export const useCanAccess = (permission: string) => {
  const { user } = useAuthStore()
  if (!user) return false
  
  // Admin and super_admin can access everything
  if (['admin', 'super_admin'].includes(user.role)) {
    return true
  }
  
  // Check specific permissions based on role
  const rolePermissions = {
    mentor: ['create_session', 'view_analytics'],
    student: [],
  }
  
  const userPermissions = rolePermissions[user.role as keyof typeof rolePermissions] || []
  return userPermissions.includes(permission)
}

export const useUserProgress = () => {
  const { user } = useAuthStore()
  if (!user) return null
  
  const completedModulesCount = user.completedModules?.length || 0
  const totalBadges = user.badges?.length || 0
  const totalLearningHours = Math.round((user.totalLearningTime || 0) / 60)
  
  return {
    completedModules: completedModulesCount,
    totalBadges,
    totalLearningHours,
    skillLevel: user.skillLevel,
    learningProgress: user.completedModules?.reduce((sum, module) => sum + (module.score || 0), 0) / Math.max(completedModulesCount, 1) || 0
  }
}