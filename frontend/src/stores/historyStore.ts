// src/stores/historyStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Conversation, Message } from '../types/api'
import { apiService } from '../services/api'

// ================================
// TYPES HISTORY STORE
// ================================

interface HistoryStore {
  // État sidebar historique
  isOpen: boolean
  conversations: Conversation[]
  selectedConversation: Conversation | null
  isLoading: boolean
  error: string | null
  
  // Topic context
  currentTopicId: string | null
  
  // Actions principales
  openHistory: (topicId: string) => Promise<void>
  closeHistory: () => void
  selectConversation: (conversation: Conversation) => Promise<void>
  loadTopicConversations: (topicId: string) => Promise<void>
  
  // Actions utilitaires
  clearError: () => void
  setLoading: (loading: boolean) => void
}

// ================================
// STORE HISTORY
// ================================

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      // État initial
      isOpen: false,
      conversations: [],
      selectedConversation: null,
      isLoading: false,
      error: null,
      currentTopicId: null,

      // ========================
      // ACTIONS PRINCIPALES
      // ========================

      openHistory: async (topicId: string) => {
        try {
          set({ 
            isOpen: true, 
            currentTopicId: topicId,
            isLoading: true,
            error: null 
          })
          
          await get().loadTopicConversations(topicId)
        } catch (error: any) {
          console.error('Erreur ouverture historique:', error)
          set({ 
            error: error.message || 'Erreur lors du chargement de l\'historique',
            isLoading: false 
          })
        }
      },

      closeHistory: () => {
        set({ 
          isOpen: false,
          selectedConversation: null,
          conversations: [],
          currentTopicId: null,
          error: null
        })
      },

      selectConversation: async (conversation: Conversation) => {
        try {
          set({ 
            selectedConversation: conversation,
            isLoading: true,
            error: null 
          })

          // Charger les messages de cette conversation dans le store conversations principal
          const conversationsStore = await import('./conversationsStore')
          await conversationsStore.useConversationsStore.getState().loadConversation(conversation.id)
          
          set({ isLoading: false })
          
          // Note: On ne ferme PAS automatiquement la sidebar historique
          // L'utilisateur peut continuer à naviguer dans l'historique
          
        } catch (error: any) {
          console.error('Erreur sélection conversation:', error)
          set({ 
            error: error.message || 'Erreur lors du chargement de la conversation',
            isLoading: false 
          })
        }
      },

      loadTopicConversations: async (topicId: string) => {
        try {
          set({ isLoading: true, error: null })
          
          console.log('🔍 HISTORY - Chargement conversations pour topic:', topicId)
          
          // Récupérer toutes les conversations de l'utilisateur
          const allConversations = await apiService.getConversations()
          
          console.log('🔍 HISTORY - Toutes les conversations:', allConversations)
          console.log('🔍 HISTORY - Nombre total:', allConversations.length)
          
          // ✅ Inspecter la structure d'une conversation
          if (allConversations.length > 0) {
            console.log('🔍 HISTORY - Structure conversation[0]:', allConversations[0])
            console.log('🔍 HISTORY - topic_ids:', allConversations[0].topic_ids)
            console.log('🔍 HISTORY - topics:', allConversations[0].topics)
          }
          
          // ✅ CORRECTION - Filtrer par topicId avec les nouveaux types
          const topicConversations = allConversations.filter(conv => {
            console.log('🔍 HISTORY - Test conversation:', conv.id, 'topic_ids:', conv.topic_ids)
            
            // Vérifier topic_ids (array)
            if (conv.topic_ids && conv.topic_ids.includes(topicId)) {
              console.log('✅ MATCH via topic_ids')
              return true
            }
            
            // Vérifier topics (objets avec relation enrichie)
            if (conv.topics && conv.topics.some(topic => topic.id === topicId)) {
              console.log('✅ MATCH via topics')
              return true
            }
            
            console.log('❌ NO MATCH')
            return false
          })
          
          console.log('🔍 HISTORY - Conversations filtrées:', topicConversations.length)
          
          // Trier par date décroissante (plus récent en premier)
          const sortedConversations = topicConversations.sort((a, b) => 
            new Date(b.updated_at || b.created_at).getTime() - 
            new Date(a.updated_at || a.created_at).getTime()
          )
          
          set({ 
            conversations: sortedConversations,
            isLoading: false 
          })
          
        } catch (error: any) {
          console.error('❌ HISTORY - Erreur chargement:', error)
          set({ 
            error: error.message || 'Erreur lors du chargement des conversations',
            isLoading: false,
            conversations: []
          })
        }
      },

      // ========================
      // ACTIONS UTILITAIRES
      // ========================

      clearError: () => {
        set({ error: null })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'history-store',
      // Persistance sélective - on ne persiste que l'état, pas les données temporaires
      partialize: (state) => ({
        // On peut persister si une conversation était sélectionnée
        selectedConversation: state.selectedConversation,
      }),
    }
  )
)

// ================================
// HOOKS UTILITAIRES
// ================================

export const useHistory = () => {
  const store = useHistoryStore()
  return {
    // État
    isOpen: store.isOpen,
    conversations: store.conversations,
    selectedConversation: store.selectedConversation,
    isLoading: store.isLoading,
    error: store.error,
    currentTopicId: store.currentTopicId,
    
    // Actions
    openHistory: store.openHistory,
    closeHistory: store.closeHistory,
    selectConversation: store.selectConversation,
    loadTopicConversations: store.loadTopicConversations,
    clearError: store.clearError,
  }
}

// Hook pour vérifier si une conversation est sélectionnée
export const useSelectedConversation = () => {
  return useHistoryStore(state => state.selectedConversation)
}

// Hook pour le statut de chargement de l'historique
export const useHistoryLoading = () => {
  return useHistoryStore(state => state.isLoading)
}

export default useHistoryStore