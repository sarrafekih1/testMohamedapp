//src/components/workspace/HistorySidebar.tsx

import React, { useEffect } from 'react'
import { X, MessageCircle, Calendar, Clock } from 'lucide-react'
import { useHistory } from '../../stores/historyStore'
import type { Conversation } from '../../types/api'
import { useConversationsStore } from '../../stores/conversationsStore'

// ================================
// TYPES
// ================================

interface HistorySidebarProps {
  className?: string
}

interface ConversationItemProps {
  conversation: Conversation
  isSelected: boolean
  onClick: (conversation: Conversation) => void
}

// ================================
// COMPOSANT CONVERSATION ITEM
// ================================

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onClick
}) => {
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return "Aujourd'hui"
    } else if (diffDays === 2) {
      return "Hier"
    } else if (diffDays <= 7) {
      return `Il y a ${diffDays - 1} jours`
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
      })
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTruncatedTitle = (title: string, maxLength: number = 40) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  return (
    <button
      onClick={() => onClick(conversation)}
      className={`
        w-full text-left p-4 border-b border-border-light transition-colors
        ${isSelected ? 'bg-sonam-primary bg-opacity-5 border-l-4 border-l-sonam-primary' : 'hover:bg-gray-50'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <MessageCircle className={`
            h-4 w-4 
            ${isSelected ? 'text-sonam-primary' : 'text-text-secondary'}
          `} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`
            font-medium text-sm leading-tight mb-1
            ${isSelected ? 'text-sonam-primary' : 'text-text-primary'}
          `}>
            {getTruncatedTitle(conversation.title || 'Conversation sans titre')}
          </h4>
          
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(conversation.updated_at || conversation.created_at)}</span>
            <span>•</span>
            <Clock className="h-3 w-3" />
            <span>{formatTime(conversation.updated_at || conversation.created_at)}</span>
          </div>
          
          {conversation.message_count && (
            <div className="mt-1 text-xs text-text-light">
              {conversation.message_count} message{conversation.message_count > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// ================================
// COMPOSANT HISTORY SIDEBAR PRINCIPAL
// ================================

const HistorySidebar: React.FC<HistorySidebarProps> = ({ className = '' }) => {
  const {
    isOpen,
    conversations,
    selectedConversation,
    isLoading,
    error,
    currentTopicId,
    closeHistory,
    selectConversation,
    clearError
  } = useHistory()

  // ========================
  // EFFECTS
  // ========================

  // Fermer en appuyant sur Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeHistory()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeHistory])

    // Dans HistorySidebar, ligne ~150
  useEffect(() => {
    console.log('🔍 Conversations historique:', conversations)
    
    // ✅ AJOUTE : Charger les conversations quand le sidebar s'ouvre
    if (isOpen && currentTopicId) {
      // Appeler le store conversations pour récupérer les conversations du topic
      const conversationsStore = useConversationsStore.getState()
      conversationsStore.fetchConversations()
    }
  }, [isOpen, currentTopicId])

  // ========================
  // HANDLERS
  // ========================

  const handleConversationClick = async (conversation: Conversation) => {
    try {
      await selectConversation(conversation)
    } catch (error) {
      console.error('Erreur sélection conversation:', error)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeHistory()
    }
  }

  // ========================
  // RENDER HELPERS
  // ========================

  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-border-light bg-white">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Historique
        </h2>
        <p className="text-sm text-text-secondary">
          Conversations de ce topic
        </p>
      </div>
      
      <button
        onClick={closeHistory}
        className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-sonam-sm transition-colors"
        title="Fermer l'historique"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <MessageCircle className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">
        Aucune conversation
      </h3>
      <p className="text-text-secondary max-w-sm">
        Vous n'avez pas encore de conversations dans ce topic. Commencez par poser une question !
      </p>
    </div>
  )

  const renderLoadingState = () => (
    <div className="p-4">
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-3">
            <div className="loading-skeleton h-4 w-4 rounded" />
            <div className="flex-1 space-y-2">
              <div className="loading-skeleton h-4 w-3/4 rounded" />
              <div className="loading-skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <MessageCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">
        Erreur de chargement
      </h3>
      <p className="text-text-secondary mb-4 max-w-sm">
        {error}
      </p>
      <button
        onClick={clearError}
        className="btn-sonam-primary"
      >
        Réessayer
      </button>
    </div>
  )

  const renderConversationsList = () => {
    if (conversations.length === 0) {
      return renderEmptyState()
    }

    // Grouper les conversations par date
    const groupedConversations = conversations.reduce((groups: Record<string, Conversation[]>, conversation) => {
      const date = new Date(conversation.updated_at || conversation.created_at)
      const dateKey = date.toDateString()
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(conversation)
      return groups
    }, {})

    const sortedDateKeys = Object.keys(groupedConversations).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    )

    return (
      <div className="flex-1 overflow-y-auto">
        {sortedDateKeys.map(dateKey => {
          const dateConversations = groupedConversations[dateKey]
          const date = new Date(dateKey)
          const isToday = date.toDateString() === new Date().toDateString()
          const isYesterday = date.toDateString() === new Date(Date.now() - 86400000).toDateString()
          
          let dateLabel = date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })
          
          if (isToday) dateLabel = "Aujourd'hui"
          else if (isYesterday) dateLabel = "Hier"

          return (
            <div key={dateKey}>
              <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-border-light">
                <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {dateLabel}
                </h3>
              </div>
              
              {dateConversations.map(conversation => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation?.id === conversation.id}
                  onClick={handleConversationClick}
                />
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  // ========================
  // RENDER PRINCIPAL
  // ========================

  if (!isOpen) return null

  return (
    <>
      {/* Overlay pour mobile */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-20 z-30 md:hidden"
        onClick={handleOverlayClick}
      />

      {/* Sidebar */}
      <div className={`
        history-sidebar fixed inset-y-0 right-0 z-40 flex flex-col bg-white
        animate-slide-in-right
        ${className}
      `}>
        {renderHeader()}
        
        {isLoading && renderLoadingState()}
        {error && !isLoading && renderErrorState()}
        {!isLoading && !error && renderConversationsList()}
      </div>
    </>
  )
}

export default HistorySidebar