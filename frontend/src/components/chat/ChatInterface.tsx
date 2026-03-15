// src/components/chat/ChatInterface.tsx
import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MessageSquare, ArrowLeft, Settings, Trash2, Edit3 } from 'lucide-react'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { useChat, useAutoLoadConversation } from '../../hooks/useChat'
import { useTopicsStore } from '../../stores/topicsStore'
import type { Topic } from '../../types/api'  // ✅ CORRIGÉ

interface ChatInterfaceProps {
  topic?: Topic
  conversationId?: string
  onSourceClick?: (documentId: string, documentName: string) => void
  onClose?: () => void
  className?: string
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  topic,
  conversationId,
  onSourceClick,
  onClose,
  className = ''
}) => {
  const navigate = useNavigate()
  const { 
    messages, 
    typingIndicator, 
    error,
    createConversation, 
    deleteConversation,
    updateConversationTitle,
    clearError 
  } = useChat()
  
  const { conversation, isLoading: isLoadingConversation } = useAutoLoadConversation(conversationId)

  // Création automatique de conversation si pas d'ID fourni
  useEffect(() => {
    const createAutoConversation = async () => {
      if (!conversationId && topic && !conversation) {
        console.log('🔵 Création auto conversation pour topic:', topic.name)
        try {
          const newConv = await createConversation({
            topic_ids: [topic.id],
            title: `Discussion sur ${topic.name}`
          })
          console.log('🟢 Conversation créée:', newConv.title)
          // Optionnel: navigation vers l'URL avec l'ID
          // navigate(`/topics/${topic.id}/chat/${newConv.id}`, { replace: true })
        } catch (error) {
          console.error('❌ Erreur création auto conversation:', error)
        }
      }
    }

    createAutoConversation()
  }, [conversationId, topic, conversation, createConversation])

  // Gestion des sources cliquées
  const handleSourceClick = (documentId: string, documentName: string) => {
    console.log('🔵 Source cliquée:', documentName, documentId)
    
    if (onSourceClick) {
      onSourceClick(documentId, documentName)
    } else if (topic) {
      // Fallback: navigation vers le topic avec focus sur le document
      navigate(`/topics/${topic.id}?document=${documentId}`)
    }
  }

  // Gestion suppression conversation
  const handleDeleteConversation = async () => {
    if (!conversation) return
    
    const confirm = window.confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')
    if (!confirm) return

    try {
      await deleteConversation(conversation.id)
      onClose?.()
      if (topic) {
        navigate(`/topics/${topic.id}`)
      }
    } catch (error) {
      console.error('❌ Erreur suppression conversation:', error)
    }
  }

  // Gestion modification titre
  const handleEditTitle = async () => {
    if (!conversation) return
    
    const newTitle = window.prompt('Nouveau titre:', conversation.title)
    if (!newTitle || newTitle === conversation.title) return

    try {
      await updateConversationTitle(conversation.id, newTitle)
    } catch (error) {
      console.error('❌ Erreur modification titre:', error)
    }
  }

  // Loading state
  if (isLoadingConversation) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p>Chargement de la conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      
      {/* Header de la conversation */}
      <div className="bg-white border-b shadow-sm p-4">
        <div className="flex items-center justify-between">
          
          {/* Informations conversation */}
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                title="Retour"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <MessageSquare className="text-primary-600" size={20} />
              <div>
                <h2 className="font-medium text-gray-900">
                  {conversation?.title || `Chat - ${topic?.name || 'Conversation'}`}
                </h2>
                {topic && (
                  <p className="text-sm text-gray-500">Topic: {topic.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {conversation && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleEditTitle}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                title="Modifier le titre"
              >
                <Edit3 size={16} />
              </button>
              
              <button
                onClick={handleDeleteConversation}
                className="p-2 text-red-400 hover:text-red-600 rounded-md hover:bg-red-50"
                title="Supprimer la conversation"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Statistiques conversation */}
        {conversation && (
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <span>{conversation.message_count} messages</span>
            <span>Créée le {new Date(conversation.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
        )}
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 m-4 rounded-md">
          <div className="flex justify-between items-start">
            <div className="text-sm text-red-800">
              <strong>Erreur:</strong> {error.message}
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700 ml-4"
            >
              ×
            </button>
          </div>
          {error.retry && (
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              Réessayer
            </button>
          )}
        </div>
      )}

      {/* Zone des messages */}
      <MessageList
        messages={messages}
        isTyping={typingIndicator.isVisible}
        typingText={typingIndicator.text}
        onSourceClick={handleSourceClick}
        className="flex-1"
      />

      {/* Zone de saisie */}
      <MessageInput
        placeholder={
          conversation
            ? "Posez votre question..."
            : "Créer une conversation pour commencer..."
        }
        disabled={!conversation}
        onSend={(message) => {
          console.log('🟢 Message envoyé depuis ChatInterface:', message.substring(0, 50))
        }}
      />

      {/* État de la conversation */}
      {!conversation && !isLoadingConversation && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 m-4 rounded-md text-center">
          <p className="text-sm text-yellow-800">
            Initialisation de la conversation en cours...
          </p>
        </div>
      )}
    </div>
  )
}

export default ChatInterface