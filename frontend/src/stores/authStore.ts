// src/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiService } from '../services/api'
import type { User, LoginRequest, RegisterRequest } from '../types/api'

// ================================
// TYPES
// ================================

export type UserRole = 'admin' | 'manager' | 'user'

interface UserPermissions {
  can_create_topic: boolean
  can_delete_topic: boolean
  can_manage_users: boolean
  can_view_all_topics: boolean
  can_view_all_users: boolean
  can_change_user_role: boolean
  can_deactivate_user: boolean
  can_delete_any_document: boolean
}

interface AuthStore {
  // State
  user: User | null
  token: string | null
  permissions: UserPermissions | null
  isLoading: boolean
  error: string | null

  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  clearError: () => void
  checkAuth: () => Promise<void>
  fetchUserPermissions: () => Promise<void>
  
  // Helpers de rôles
  isAdmin: () => boolean
  isManager: () => boolean
  isUser: () => boolean
  
  // Helpers de permissions
  canCreateTopic: () => boolean
  canDeleteTopic: () => boolean
  canManageUsers: () => boolean
  canViewAllUsers: () => boolean
  canChangeUserRole: () => boolean
}

// ================================
// STORE
// ================================

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // État initial
      user: null,
      token: null,
      permissions: null,
      isLoading: false,
      error: null,

      // ========================
      // ACTIONS AUTH
      // ========================

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiService.login(credentials)
          localStorage.setItem('auth_token', response.access_token)
          set({
            user: response.user,
            token: response.access_token,
            isLoading: false,
            error: null
          })
          // Charger les permissions après connexion
          await get().fetchUserPermissions()
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Erreur de connexion'
          set({
            error: errorMessage,
            isLoading: false,
            user: null,
            token: null
          })
          throw error
        }
      },

      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiService.register(userData)
          localStorage.setItem('auth_token', response.access_token)
          set({
            user: response.user,
            token: response.access_token,
            isLoading: false,
            error: null
          })
          // Charger les permissions après inscription
          await get().fetchUserPermissions()
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Erreur lors de l\'inscription'
          set({
            error: errorMessage,
            isLoading: false,
            user: null,
            token: null
          })
          throw error
        }
      },

      logout: () => {
        try {
          apiService.logout().catch(() => {})
        } finally {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          set({
            user: null,
            token: null,
            permissions: null,
            error: null
          })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      checkAuth: async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          set({ user: null, token: null, permissions: null })
          return
        }

        set({ isLoading: true })
        try {
          const user = await apiService.getCurrentUser()
          set({
            user,
            token,
            isLoading: false,
            error: null
          })
          // Charger les permissions
          await get().fetchUserPermissions()
        } catch (error) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          set({
            user: null,
            token: null,
            permissions: null,
            isLoading: false,
            error: null
          })
        }
      },

      // ========================
      // FETCH PERMISSIONS
      // ========================

      fetchUserPermissions: async () => {
        try {
          const response = await apiService.getUserPermissions()
          set({ permissions: response.permissions })
        } catch (error) {
          console.error('Erreur chargement permissions:', error)
          // Ne pas bloquer si échec
        }
      },

      // ========================
      // HELPERS DE RÔLES
      // ========================

      isAdmin: () => {
        const { user } = get()
        return user?.role === 'admin'
      },

      isManager: () => {
        const { user } = get()
        return user?.role === 'manager'
      },

      isUser: () => {
        const { user } = get()
        return user?.role === 'user'
      },

      // ========================
      // HELPERS DE PERMISSIONS
      // ========================

      canCreateTopic: () => {
        const { permissions } = get()
        return permissions?.can_create_topic ?? false
      },

      canDeleteTopic: () => {
        const { permissions } = get()
        return permissions?.can_delete_topic ?? false
      },

      canManageUsers: () => {
        const { permissions } = get()
        return permissions?.can_manage_users ?? false
      },

      canViewAllUsers: () => {
        const { permissions } = get()
        return permissions?.can_view_all_users ?? false
      },

      canChangeUserRole: () => {
        const { permissions } = get()
        return permissions?.can_change_user_role ?? false
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        permissions: state.permissions,
      }),
    }
  )
)

// ================================
// HOOK EXPORT
// ================================

export const useAuth = () => {
  const store = useAuthStore()
  return {
    // État
    user: store.user,
    token: store.token,
    permissions: store.permissions,
    isLoading: store.isLoading,
    error: store.error,
    
    // Actions
    login: store.login,
    register: store.register,
    logout: store.logout,
    clearError: store.clearError,
    checkAuth: store.checkAuth,
    fetchUserPermissions: store.fetchUserPermissions,
    
    // Helpers
    isAdmin: store.isAdmin,
    isManager: store.isManager,
    isUser: store.isUser,
    canCreateTopic: store.canCreateTopic,
    canDeleteTopic: store.canDeleteTopic,
    canManageUsers: store.canManageUsers,
    canViewAllUsers: store.canViewAllUsers,
    canChangeUserRole: store.canChangeUserRole,
  }
}