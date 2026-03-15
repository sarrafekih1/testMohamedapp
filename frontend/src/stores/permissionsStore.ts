// src/stores/permissionsStore.ts
import { create } from 'zustand'
import { apiService } from '../services/api'
import type { 
  TopicPermission, 
  GrantPermissionRequest, 
  UpdatePermissionRequest,
  UserBasic,
  PermissionLevel
} from '../types/api'

// ================================
// TYPES
// ================================

interface PermissionsStore {
  // State
  permissions: TopicPermission[]
  availableUsers: UserBasic[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchTopicPermissions: (topicId: string) => Promise<void>
  fetchAvailableUsers: (topicId: string, search?: string) => Promise<void>
  grantPermission: (topicId: string, userId: string, permission: PermissionLevel) => Promise<void>
  revokePermission: (topicId: string, userId: string) => Promise<void>
  updatePermission: (topicId: string, userId: string, newPermission: PermissionLevel) => Promise<void>
  clearError: () => void
  reset: () => void
}

// ================================
// STORE
// ================================

export const usePermissionsStore = create<PermissionsStore>((set, get) => ({
  // État initial
  permissions: [],
  availableUsers: [],
  isLoading: false,
  error: null,

  // ========================
  // FETCH PERMISSIONS
  // ========================

  fetchTopicPermissions: async (topicId: string) => {
    set({ isLoading: true, error: null })
    try {
      const permissions = await apiService.getTopicPermissions(topicId)
      set({
        permissions,
        isLoading: false,
        error: null
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors du chargement des permissions'
      set({
        error: errorMessage,
        isLoading: false
      })
    }
  },

  // ========================
  // FETCH AVAILABLE USERS
  // ========================

  fetchAvailableUsers: async (topicId: string, search?: string) => {
    set({ isLoading: true, error: null })
    try {
      const users = await apiService.getAvailableUsersForTopic(topicId, search)
      set({
        availableUsers: users,
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
  // GRANT PERMISSION
  // ========================

  grantPermission: async (topicId: string, userId: string, permission: PermissionLevel) => {
    set({ isLoading: true, error: null })
    try {
      const data: GrantPermissionRequest = { user_id: userId, permission }
      const newPermission = await apiService.grantTopicPermission(topicId, data)
      
      // Ajouter à la liste
      set(state => ({
        permissions: [newPermission, ...state.permissions],
        availableUsers: state.availableUsers.filter(u => u.id !== userId),
        isLoading: false,
        error: null
      }))
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de l\'attribution de la permission'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // ========================
  // REVOKE PERMISSION
  // ========================

  revokePermission: async (topicId: string, userId: string) => {
    set({ isLoading: true, error: null })
    try {
      await apiService.revokeTopicPermission(topicId, userId)
      
      // Retirer de la liste
      set(state => ({
        permissions: state.permissions.filter(p => p.user_id !== userId),
        isLoading: false,
        error: null
      }))
      
      // Recharger les users disponibles
      await get().fetchAvailableUsers(topicId)
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de la révocation de la permission'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // ========================
  // UPDATE PERMISSION
  // ========================

  updatePermission: async (topicId: string, userId: string, newPermission: PermissionLevel) => {
    set({ isLoading: true, error: null })
    try {
      const data: UpdatePermissionRequest = { permission: newPermission }
      const updatedPermission = await apiService.updateTopicPermission(topicId, userId, data)
      
      // Mettre à jour dans la liste
      set(state => ({
        permissions: state.permissions.map(p =>
          p.user_id === userId ? updatedPermission : p
        ),
        isLoading: false,
        error: null
      }))
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de la modification de la permission'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw error
    }
  },

  // ========================
  // UTILS
  // ========================

  clearError: () => {
    set({ error: null })
  },

  reset: () => {
    set({
      permissions: [],
      availableUsers: [],
      isLoading: false,
      error: null
    })
  },
}))

// ================================
// HOOK EXPORT
// ================================

export const usePermissions = () => {
  const store = usePermissionsStore()
  return {
    // État
    permissions: store.permissions,
    availableUsers: store.availableUsers,
    isLoading: store.isLoading,
    error: store.error,
    
    // Actions
    fetchTopicPermissions: store.fetchTopicPermissions,
    fetchAvailableUsers: store.fetchAvailableUsers,
    grantPermission: store.grantPermission,
    revokePermission: store.revokePermission,
    updatePermission: store.updatePermission,
    clearError: store.clearError,
    reset: store.reset,
  }
}