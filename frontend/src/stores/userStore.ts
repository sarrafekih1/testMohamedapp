// src/stores/userStore.ts
import { create } from 'zustand'
import { apiService } from '../services/api'
import type { UserListItem, UserDetail, UserUpdate, UserRoleUpdate, UserStats } from '../types/api'

// ================================
// TYPES
// ================================

interface UserStore {
  // State
  users: UserListItem[]
  selectedUser: UserDetail | null
  stats: UserStats | null
  isLoading: boolean
  error: string | null

  // Filters
  filters: {
    role?: 'user' | 'manager' | 'admin'
    is_active?: boolean
    search?: string
  }

  // Actions
  fetchUsers: () => Promise<void>
  fetchUserById: (userId: string) => Promise<UserDetail>
  updateUser: (userId: string, data: UserUpdate) => Promise<UserDetail>
  updateUserRole: (userId: string, role: 'user' | 'manager' | 'admin') => Promise<UserDetail>
  deactivateUser: (userId: string) => Promise<void>
  fetchStats: () => Promise<void>
  setFilters: (filters: Partial<UserStore['filters']>) => void
  clearFilters: () => void
  clearError: () => void
  selectUser: (user: UserDetail | null) => void
}

// ================================
// STORE
// ================================

export const useUserStore = create<UserStore>((set, get) => ({
  // État initial
  users: [],
  selectedUser: null,
  stats: null,
  isLoading: false,
  error: null,
  filters: {},

  // ========================
  // FETCH USERS
  // ========================

  fetchUsers: async () => {
    set({ isLoading: true, error: null })
    try {
      const { filters } = get()
      const users = await apiService.getUsers({
        skip: 0,
        limit: 100,
        ...filters
      })
      set({
        users,
        isLoading: false,
        error: null
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors du chargement des utilisateurs'
      set({
        error: errorMessage,
        isLoading: false
      })
    }
  },

  // ========================
  // FETCH USER BY ID
  // ========================

  fetchUserById: async (userId: string) => {
    set({ isLoading: true, error: null })
    try {
      const user = await apiService.getUserById(userId)
      set({
        selectedUser: user,
        isLoading: false,
        error: null
      })
      return user
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors du chargement de l\'utilisateur'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // ========================
  // UPDATE USER
  // ========================

  updateUser: async (userId: string, data: UserUpdate) => {
    set({ isLoading: true, error: null })
    try {
      const updatedUser = await apiService.updateUser(userId, data)
      
      // Mettre à jour la liste des users
      set(state => ({
        users: state.users.map(user =>
          user.id === userId
            ? { ...user, ...data }
            : user
        ),
        selectedUser: state.selectedUser?.id === userId ? updatedUser : state.selectedUser,
        isLoading: false,
        error: null
      }))
      
      return updatedUser
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de la mise à jour de l\'utilisateur'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // ========================
  // UPDATE USER ROLE
  // ========================

  updateUserRole: async (userId: string, role: 'user' | 'manager' | 'admin') => {
    set({ isLoading: true, error: null })
    try {
      const updatedUser = await apiService.updateUserRole(userId, { role })
      
      // Mettre à jour la liste
      set(state => ({
        users: state.users.map(user =>
          user.id === userId
            ? { ...user, role }
            : user
        ),
        selectedUser: state.selectedUser?.id === userId ? updatedUser : state.selectedUser,
        isLoading: false,
        error: null
      }))
      
      return updatedUser
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors du changement de rôle'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // ========================
  // DEACTIVATE USER
  // ========================

  deactivateUser: async (userId: string) => {
    set({ isLoading: true, error: null })
    try {
      await apiService.deactivateUser(userId)
      
      // Mettre à jour la liste (marquer comme inactif)
      set(state => ({
        users: state.users.map(user =>
          user.id === userId
            ? { ...user, is_active: false }
            : user
        ),
        isLoading: false,
        error: null
      }))
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de la désactivation de l\'utilisateur'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // ========================
  // FETCH STATS
  // ========================

  fetchStats: async () => {
    set({ isLoading: true, error: null })
    try {
      const stats = await apiService.getUserStats()
      set({
        stats,
        isLoading: false,
        error: null
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors du chargement des statistiques'
      set({
        error: errorMessage,
        isLoading: false
      })
    }
  },

  // ========================
  // FILTERS
  // ========================

  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters }
    }))
    // Recharger automatiquement avec les nouveaux filtres
    get().fetchUsers()
  },

  clearFilters: () => {
    set({ filters: {} })
    get().fetchUsers()
  },

  // ========================
  // UTILS
  // ========================

  clearError: () => {
    set({ error: null })
  },

  selectUser: (user) => {
    set({ selectedUser: user })
  },
}))

// ================================
// HOOK EXPORT
// ================================

export const useUsers = () => {
  const store = useUserStore()
  return {
    // État
    users: store.users,
    selectedUser: store.selectedUser,
    stats: store.stats,
    isLoading: store.isLoading,
    error: store.error,
    filters: store.filters,
    
    // Actions
    fetchUsers: store.fetchUsers,
    fetchUserById: store.fetchUserById,
    updateUser: store.updateUser,
    updateUserRole: store.updateUserRole,
    deactivateUser: store.deactivateUser,
    fetchStats: store.fetchStats,
    setFilters: store.setFilters,
    clearFilters: store.clearFilters,
    clearError: store.clearError,
    selectUser: store.selectUser,
  }
}