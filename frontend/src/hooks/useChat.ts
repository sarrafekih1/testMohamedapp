// Hooks utilitaires pour le système de chat
// Hooks utilitaires pour le système de chat - Version simplifiée
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useConversationsStore } from '../stores/conversationsStore'
import type { Conversation, Message, ChatError } from '../types/api'

/**
 * Hook principal pour utiliser le système de chat
 */
export const useChat = () => {
  const store = useConversationsStore()
  
  return {
    // État
    conversations: store.conversations,
    currentConversation: store.currentConversation,
    messages: store.messages,
    
    // États UI
    isLoading: store.isLoading,
    isSending: store.isSending,
    isLoadingConversation: store.isLoadingConversation,
    typingIndicator: store.typingIndicator,
    error: store.error,
    
    // Actions
    fetchConversations: store.fetchConversations,
    createConversation: store.createConversation,
    loadConversation: store.loadConversation,
    updateConversationTitle: store.updateConversationTitle,
    deleteConversation: store.deleteConversation,
    setCurrentConversation: store.setCurrentConversation,
    sendMessage: store.sendMessage,
    setTyping: store.setTyping,
    clearError: store.clearError,
    resetState: store.resetState
  }
}

/**
 * Hook pour récupérer une conversation par ID
 */
export const useConversationById = (conversationId: string | undefined) => {
  const conversations = useConversationsStore(state => state.conversations)
  
  return useMemo(() => {
    if (!conversationId) return null
    return conversations.find(conv => conv.id === conversationId) || null
  }, [conversationId, conversations])
}

/**
 * Hook pour gérer automatiquement le chargement d'une conversation
 */
export const useAutoLoadConversation = (conversationId: string | undefined) => {
  const { loadConversation, currentConversation, isLoadingConversation, error } = useChat()
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (conversationId && (!currentConversation || currentConversation.id !== conversationId) && !hasLoaded) {
      console.log('🔄 Auto-loading conversation:', conversationId)
      loadConversation(conversationId)
        .then(() => setHasLoaded(true))
        .catch(() => setHasLoaded(true)) // Marquer comme chargé même en cas d'erreur
    }
  }, [conversationId, currentConversation, loadConversation, hasLoaded])

  // Reset hasLoaded when conversationId changes
  useEffect(() => {
    setHasLoaded(false)
  }, [conversationId])

  return {
    conversation: currentConversation,
    isLoading: isLoadingConversation,
    error,
    hasLoaded
  }
}

/**
 * Hook pour les statistiques de messages
 */
export const useMessageStats = () => {
  const messages = useConversationsStore(state => state.messages)
  
  return useMemo(() => {
    const userMessages = messages.filter(msg => msg.is_from_user)
    const aiMessages = messages.filter(msg => !msg.is_from_user)
    
    const totalTokens = aiMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0)
    const avgProcessingTime = aiMessages.length > 0 
      ? aiMessages.reduce((sum, msg) => sum + (msg.processing_time || 0), 0) / aiMessages.length
      : 0

    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      totalTokens,
      avgProcessingTime: Math.round(avgProcessingTime)
    }
  }, [messages])
}

/**
 * Hook pour l'état de frappe (typing indicator)
 */
export const useTypingIndicator = () => {
  const { typingIndicator, setTyping } = useChat()
  
  const startTyping = useCallback((text?: string) => {
    setTyping(true, text)
  }, [setTyping])
  
  const stopTyping = useCallback(() => {
    setTyping(false)
  }, [setTyping])
  
  return {
    isTyping: typingIndicator.isVisible,
    typingText: typingIndicator.text,
    startTyping,
    stopTyping
  }
}

/**
 * Hook pour gérer l'envoi de messages avec validation
 */
export const useSendMessage = () => {
  const { sendMessage, currentConversation, isSending } = useChat()
  const [validationError, setValidationError] = useState<string | null>(null)

  const send = useCallback(async (content: string) => {
    // Validation côté client
    if (!content.trim()) {
      setValidationError('Le message ne peut pas être vide')
      return false
    }

    if (content.length > 10000) {
      setValidationError('Le message est trop long (maximum 10 000 caractères)')
      return false
    }

    if (!currentConversation) {
      setValidationError('Aucune conversation sélectionnée')
      return false
    }

    setValidationError(null)

    try {
      await sendMessage(currentConversation.id, content)
      return true
    } catch (error) {
      // L'erreur est déjà gérée par le store
      return false
    }
  }, [sendMessage, currentConversation])

  const clearValidationError = useCallback(() => {
    setValidationError(null)
  }, [])

  return {
    send,
    isSending,
    validationError,
    clearValidationError,
    canSend: !!currentConversation && !isSending
  }
}

/**
 * Hook pour formater les sources des messages IA
 */
export const useMessageSources = (message: Message | undefined) => {
  return useMemo(() => {
    if (!message || !message.sources || message.sources.length === 0) {
      return {
        hasSource: false,
        sources: [],
        formattedSources: '',
        uniqueDocuments: []
      }
    }

    const sources = message.sources
    const uniqueDocuments = Array.from(
      new Set(sources.map(s => s.document_name || 'Document'))
    ).map(docName => {
      const source = sources.find(s => (s.document_name || 'Document') === docName)!
      return {
        name: docName,
        topicName: source.topic_name || 'Topic',
        documentId: source.document_id || ''
      }
    })

    const formattedSources = sources
      .map((source, index) => `[${index + 1}] ${source.document_name || 'Document'}`)
      .join(', ')

    return {
      hasSource: true,
      sources,
      formattedSources,
      uniqueDocuments
    }
  }, [message])
}

/**
 * Hook pour auto-scroll vers le dernier message
 */
export const useAutoScroll = (dependency?: any) => {
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const messagesEndRef = useCallback((node: HTMLDivElement | null) => {
    if (node && shouldAutoScroll) {
      node.scrollIntoView({ behavior: 'smooth' })
    }
  }, [shouldAutoScroll])

  // Auto-scroll quand les messages changent
  useEffect(() => {
    if (shouldAutoScroll && dependency !== undefined) {
      setTimeout(() => {
        const element = document.getElementById('messages-end')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [dependency, shouldAutoScroll])

  return {
    messagesEndRef,
    shouldAutoScroll,
    setShouldAutoScroll
  }
}