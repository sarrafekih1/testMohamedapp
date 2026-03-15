// src/stores/conversationsStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiService } from '../services/api'
import type {
  Conversation,
  ConversationCreate,
  ConversationUpdate,
  Message,
  ChatResponse,
  TypingIndicator,
  ChatError
} from '../types/api'

interface ConversationsStore {
  // État principal
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: Message[]
  
  // États UI
  isLoading: boolean
  isSending: boolean
  isLoadingConversation: boolean
  typingIndicator: TypingIndicator
  error: ChatError | null
  
  // Actions - Conversations
  fetchConversations: () => Promise<void>
  createConversation: (data: ConversationCreate) => Promise<Conversation>
  createNewConversation: (topicId: string) => Promise<Conversation> 
  loadConversation: (conversationId: string) => Promise<void>
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>
  setCurrentConversation: (conversation: Conversation | null) => void
  
  // Actions - Messages
  sendMessage: (conversationId: string, content: string) => Promise<void>
  addMessage: (message: Message) => void
  clearMessages: () => void
  
  // Actions - UI
  setTyping: (isVisible: boolean, text?: string) => void
  clearError: () => void
  resetState: () => void
}

export const useConversationsStore = create<ConversationsStore>()(
  persist(
    (set, get) => ({
      // État initial
      conversations: [],
      currentConversation: null,
      messages: [],
      
      // États UI
      isLoading: false,
      isSending: false,
      isLoadingConversation: false,
      typingIndicator: { isVisible: false, text: '' },
      error: null,

      // Actions - Conversations
      fetchConversations: async () => {
        console.log('🔵 FETCH CONVERSATIONS - Début')
        set({ isLoading: true, error: null })
        
        try {
          const conversations = await apiService.getConversations()
          console.log('🟢 Conversations récupérées:', conversations.length)
          
          set({
            conversations,
            isLoading: false
          })
        } catch (error: any) {
          console.error('❌ Erreur fetch conversations:', error)
          const errorMessage = error.response?.data?.detail || 'Erreur lors du chargement des conversations'
          
          set({
            isLoading: false,
            error: { message: errorMessage, retry: true }
          })
        }
      },

      createConversation: async (data: ConversationCreate) => {
        console.log('🔵 CREATE CONVERSATION:', data)
        set({ isLoading: true, error: null })
        
        try {
          const newConversation = await apiService.createConversation(data)
          console.log('🟢 Conversation créée:', newConversation)
          
          set(state => ({
            conversations: [newConversation, ...state.conversations],
            currentConversation: newConversation,
            messages: [], // Nouvelle conversation = messages vides
            isLoading: false
          }))
          
          return newConversation
        } catch (error: any) {
          console.error('❌ Erreur création conversation:', error)
          const errorMessage = error.response?.data?.detail || 'Erreur lors de la création de la conversation'
          
          set({
            isLoading: false,
            error: { message: errorMessage, retry: false }
          })
          throw error
        }
      },

      createNewConversation: async (topicId: string) => {
        const now = new Date()
        const title = `Conversation - ${now.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric'
        })} ${now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })}`
        
        return await get().createConversation({
          topic_ids: [topicId],
          title
        })
      },

      loadConversation: async (conversationId: string) => {
        console.log('🔵 LOAD CONVERSATION:', conversationId)
        set({ isLoadingConversation: true, error: null })
        
        try {
          const response = await apiService.getConversation(conversationId)
          console.log('🟢 Conversation chargée:', response.title, 'Messages:', response.messages?.length || 0)
          
          // ✅ TOUJOURS charger les messages depuis le serveur pour éviter désync
          set({
            currentConversation: response,
            messages: response.messages || [],
            isLoadingConversation: false
          })
        } catch (error: any) {
          console.error('❌ Erreur chargement conversation:', error)
          const errorMessage = error.response?.data?.detail || 'Conversation introuvable'
          
          set({
            isLoadingConversation: false,
            currentConversation: null,
            messages: [],
            error: { message: errorMessage, retry: true }
          })
        }
      },

      updateConversationTitle: async (conversationId: string, title: string) => {
        console.log('🔵 UPDATE CONVERSATION TITLE:', conversationId, title)
        
        try {
          const updatedConversation = await apiService.updateConversation(conversationId, { title })
          console.log('🟢 Titre mis à jour:', updatedConversation.title)
          
          set(state => ({
            conversations: state.conversations.map(conv =>
              conv.id === conversationId ? updatedConversation : conv
            ),
            currentConversation: state.currentConversation?.id === conversationId 
              ? updatedConversation 
              : state.currentConversation
          }))
        } catch (error: any) {
          console.error('❌ Erreur mise à jour titre:', error)
          const errorMessage = error.response?.data?.detail || 'Erreur lors de la mise à jour'
          
          set({ error: { message: errorMessage, retry: false } })
        }
      },

      deleteConversation: async (conversationId: string) => {
        console.log('🔵 DELETE CONVERSATION:', conversationId)
        
        try {
          await apiService.deleteConversation(conversationId)
          console.log('🟢 Conversation supprimée')
          
          set(state => ({
            conversations: state.conversations.filter(conv => conv.id !== conversationId),
            currentConversation: state.currentConversation?.id === conversationId 
              ? null 
              : state.currentConversation,
            messages: state.currentConversation?.id === conversationId ? [] : state.messages
          }))
        } catch (error: any) {
          console.error('❌ Erreur suppression conversation:', error)
          const errorMessage = error.response?.data?.detail || 'Erreur lors de la suppression'
          
          set({ error: { message: errorMessage, retry: false } })
        }
      },

      setCurrentConversation: (conversation: Conversation | null) => {
        console.log('🔵 SET CURRENT CONVERSATION:', conversation?.title || 'null')
        set({ 
          currentConversation: conversation,
          messages: [] // Reset messages lors du changement
        })
      },

      // Actions - Messages
      sendMessage: async (conversationId: string, content: string) => {
        console.log('🔵 SEND MESSAGE:', conversationId, content.substring(0, 50) + '...')
        
        // Ajout immédiat du message utilisateur (optimistic)
        const userMessage: Message = {
          id: `temp-${Date.now()}`, // ID temporaire
          content,
          is_from_user: true,
          conversation_id: conversationId,
          created_at: new Date().toISOString()
        }

        set(state => ({
          messages: [...state.messages, userMessage],
          isSending: true,
          error: null,
          typingIndicator: { isVisible: true, text: 'L\'IA réfléchit...' }
        }))

        try {
          console.log('🔵 Appel API sendMessage...')
          const response: ChatResponse = await apiService.sendMessage(conversationId, content)
          
          console.log('🔍 DEBUG RESPONSE STRUCTURE:', response)
          console.log('🟢 Réponse IA reçue:', response.ai_response?.content?.substring(0, 100) + '...')
          
          // Mapper la réponse backend vers la structure attendue
          const aiMessage: Message = {
            id: response.ai_response.id,
            content: response.ai_response.content,
            is_from_user: false,
            sources: response.ai_response.sources || [],
            processing_time: response.ai_response.processing_time_ms,
            token_count: response.ai_response.token_count,
            conversation_id: conversationId,
            created_at: response.ai_response.timestamp
          }

          const userMessageFinal: Message = {
            id: response.user_message.id,
            content: response.user_message.content,
            is_from_user: true,
            conversation_id: conversationId,
            created_at: response.user_message.timestamp
          }
          
          // Remplacer le message temporaire par les vrais messages du backend
          set(state => {
            // Enlever le message temporaire et ajouter les vrais messages
            const messagesWithoutTemp = state.messages.filter(msg => !msg.id.startsWith('temp-'))
            
            return {
              messages: [...messagesWithoutTemp, userMessageFinal, aiMessage], // User + IA
              isSending: false,
              typingIndicator: { isVisible: false, text: '' },
              // Mettre à jour la conversation avec le nouveau message_count
              conversations: state.conversations.map(conv =>
                conv.id === conversationId 
                  ? { ...conv, message_count: conv.message_count + 2 } // +2 car user + IA
                  : conv
              ),
              currentConversation: state.currentConversation?.id === conversationId
                ? { ...state.currentConversation, message_count: state.currentConversation.message_count + 2 }
                : state.currentConversation
            }
          })
        } catch (error: any) {
          console.error('❌ Erreur envoi message:', error)
          
          // Enlever le message temporaire en cas d'erreur
          set(state => ({
            messages: state.messages.filter(msg => !msg.id.startsWith('temp-')),
            isSending: false,
            typingIndicator: { isVisible: false, text: '' },
            error: {
              message: error.response?.data?.detail || 'Erreur lors de l\'envoi du message',
              retry: true
            }
          }))
        }
      },

      addMessage: (message: Message) => {
        console.log('🔵 ADD MESSAGE:', message.is_from_user ? 'USER' : 'IA')
        set(state => ({
          messages: [...state.messages, message]
        }))
      },

      clearMessages: () => {
        console.log('🔵 CLEAR MESSAGES')
        set({ messages: [] })
      },

      // Actions - UI
      setTyping: (isVisible: boolean, text = 'L\'IA écrit...') => {
        set({ typingIndicator: { isVisible, text } })
      },

      clearError: () => {
        set({ error: null })
      },

      resetState: () => {
        console.log('🔵 RESET STORE STATE')
        set({
          conversations: [],
          currentConversation: null,
          messages: [],
          isLoading: false,
          isSending: false,
          isLoadingConversation: false,
          typingIndicator: { isVisible: false, text: '' },
          error: null
        })
      }
    }),
    {
      name: 'conversations-store',
      // Ne persister que les données essentielles, pas les états UI
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversation: state.currentConversation,
        messages: state.messages,  // ✅ AJOUTE cette ligne
      })
    }
  )
)

// ✅ HOOK EXPORT - C'est ce qui manquait !
export const useConversations = () => {
  const store = useConversationsStore()
  return {
    // État
    conversations: store.conversations,
    currentConversation: store.currentConversation,
    messages: store.messages,
    isLoading: store.isLoading,
    isSending: store.isSending,
    isLoadingConversation: store.isLoadingConversation,
    typingIndicator: store.typingIndicator,
    error: store.error,
    
    // Actions
    fetchConversations: store.fetchConversations,
    createConversation: store.createConversation,
    createNewConversation: store.createNewConversation, // ✅ NOUVEAU
    loadConversation: store.loadConversation,
    updateConversationTitle: store.updateConversationTitle,
    deleteConversation: store.deleteConversation,
    setCurrentConversation: store.setCurrentConversation,
    sendMessage: store.sendMessage,
    addMessage: store.addMessage,
    clearMessages: store.clearMessages,
    setTyping: store.setTyping,
    clearError: store.clearError,
    resetState: store.resetState,
  }
}