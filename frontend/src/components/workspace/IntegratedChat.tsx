// src/components/workspace/IntegratedChat.tsx

import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Bot, Copy, ThumbsUp, ThumbsDown, RotateCcw, AlertCircle, FileText } from 'lucide-react'
import { useConversations } from '../../stores/conversationsStore'
import { useAuth } from '../../stores/authStore'
import type { Message, MessageSource } from '../../types/api'

// ================================
// TYPES
// ================================

interface IntegratedChatProps {
  topicId: string
  hasReadyDocuments: boolean
  disabled?: boolean
  className?: string
}

interface MessageBubbleProps {
  message: Message
  userInitials: string
}

// ================================
// COMPOSANT MESSAGE BUBBLE MODERNE
// ================================

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, userInitials }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderSources = (sources: MessageSource[]) => {
    if (!sources || sources.length === 0) return null

    return (
      <div className="mt-3 pt-3 border-t border-border-light">
        <p className="text-xs text-text-secondary mb-2 font-medium">Sources :</p>
        <div className="flex flex-wrap gap-2">
          {sources.map((source, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-2 py-1 bg-bg-light rounded text-xs text-text-secondary border border-border-light hover:border-sonam-primary transition-colors cursor-pointer"
            >
              <FileText className="h-3 w-3" />
              <span className="font-medium">{source.document_name}</span>
              <span className="text-text-light">({source.similarity_score.toFixed(2)})</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderMetadata = () => {
    if (!message.processing_time && !message.token_count) return null

    return (
      <div className="mt-2 text-xs text-text-light">
        {message.processing_time && (
          <span>Temps: {(message.processing_time / 1000).toFixed(1)}s</span>
        )}
        {message.processing_time && message.token_count && <span> • </span>}
        {message.token_count && (
          <span>Tokens: {message.token_count}</span>
        )}
      </div>
    )
  }

  const isUser = message.is_from_user

  return (
    <div className={`message-container ${isUser ? 'user' : ''}`}>
      {/* Avatar */}
      <div className={`message-avatar ${isUser ? 'user' : 'ai'}`}>
        {isUser ? (
          <span>{userInitials}</span>
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </div>

      {/* Message Content */}
      <div className="message-content-wrapper group">
        <div className={isUser ? 'message-user' : 'message-ai message-bubble-ai'}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
          
          {!isUser && message.sources && renderSources(message.sources)}
          {!isUser && renderMetadata()}
          
          <div className="mt-2 text-xs opacity-70">
            {new Date(message.created_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* Actions Hover (seulement pour IA) */}
        {!isUser && (
          <div className="message-actions">
            <button
              onClick={handleCopy}
              className="message-action-button"
              title="Copier"
            >
              {copied ? (
                <span className="text-green-600">✓</span>
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              className="message-action-button"
              title="J'aime"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              className="message-action-button"
              title="Je n'aime pas"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            <button
              className="message-action-button"
              title="Régénérer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ================================
// COMPOSANT TYPING INDICATOR MODERNE
// ================================

const TypingIndicator: React.FC = () => (
  <div className="typing-indicator-container">
    <div className="message-avatar ai">
      <Bot className="h-5 w-5" />
    </div>
    
    <div className="message-ai max-w-fit">
      <div className="flex items-center gap-3">
        <div className="typing-dots">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
        </div>
        <span className="typing-text">L'IA réfléchit...</span>
      </div>
    </div>
  </div>
)

// ================================
// COMPOSANT INTEGRATED CHAT PRINCIPAL
// ================================

const IntegratedChat: React.FC<IntegratedChatProps> = ({
  topicId,
  hasReadyDocuments,
  disabled = false,
  className = ''
}) => {
  const { user } = useAuth()
  const { 
    messages, 
    currentConversation,
    isSending,
    typingIndicator,
    createConversation,
    sendMessage
  } = useConversations()

  // États locaux
  const [inputValue, setInputValue] = useState('')
  const [conversationReady, setConversationReady] = useState(false)

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initiales utilisateur
  const userInitials = user?.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  // ========================
  // EFFECTS
  // ========================

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingIndicator.isVisible])

  // Initialiser conversation
  useEffect(() => {
    const initializeConversation = async () => {
      if (!topicId || !hasReadyDocuments) {
        setConversationReady(false)
        return
      }

      try {
        const hasActiveConversation = currentConversation && 
          currentConversation.topic_ids?.includes(topicId)

        if (!hasActiveConversation) {
          await createConversation({
            topic_ids: [topicId],
            title: `Conversation - ${new Date().toLocaleDateString('fr-FR')}`
          })
        }

        setConversationReady(true)
      } catch (error) {
        console.error('Erreur initialisation conversation:', error)
        setConversationReady(false)
      }
    }

    initializeConversation()
  }, [topicId, hasReadyDocuments, currentConversation, createConversation])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }, [inputValue])

  // ========================
  // HANDLERS
  // ========================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim() || !currentConversation || isSending || disabled) {
      return
    }

    const messageContent = inputValue.trim()
    setInputValue('')

    try {
      await sendMessage(currentConversation.id, messageContent)
    } catch (error) {
      console.error('Erreur envoi message:', error)
      setInputValue(messageContent)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  // ========================
  // RENDER HELPERS
  // ========================

  const renderDisabledState = () => (
    <div className="flex items-center justify-center py-12 text-center">
      <div>
        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <p className="text-text-secondary font-medium mb-1">
          Chat non disponible
        </p>
        <p className="text-sm text-text-light">
          {!hasReadyDocuments 
            ? 'Ajoutez et attendez que vos documents soient traités pour commencer à discuter.'
            : 'Une erreur empêche l\'utilisation du chat.'
          }
        </p>
      </div>
    </div>
  )

  const renderEmptyState = () => (
    <div className="flex items-center justify-center py-12 text-center h-full">
      <div>
        <div className="w-12 h-12 bg-sonam-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Send className="h-6 w-6 text-sonam-primary" />
        </div>
        <p className="text-text-secondary font-medium mb-1">
          Commencez la conversation
        </p>
        <p className="text-sm text-text-light">
          Posez une question sur vos documents...
        </p>
      </div>
    </div>
  )

  // ========================
  // RENDER PRINCIPAL
  // ========================

  if (disabled || !hasReadyDocuments) {
    return <div className={className}>{renderDisabledState()}</div>
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Zone Messages avec Spacing Moderne */}
      {/* <div className="chat-messages-container" style={{ overflowY: 'auto', maxHeight: '100%' }}> */}
      <div className="chat-messages-container">

        <div className="chat-messages-inner">
          {messages.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {messages.map(message => (
                <MessageBubble 
                  key={message.id} 
                  message={message}
                  userInitials={userInitials}
                />
              ))}
              {typingIndicator.isVisible && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Zone Input Bottom Moderne */}
      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-input-wrapper">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question sur vos documents..."
            className="chat-textarea-modern"
            disabled={isSending || !conversationReady}
            maxLength={10000}
          />

          {/* Toolbar Bottom */}
          <div className="chat-input-toolbar">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="chat-attach-button"
                title="Attacher un fichier"
              >
                <Paperclip className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="chat-char-counter">
                {inputValue.length}/10000
              </span>

              <button
                type="submit"
                disabled={!inputValue.trim() || isSending || !conversationReady}
                className="chat-send-button"
                title="Envoyer le message"
              >
                {isSending ? (
                  <div className="loading-spinner h-5 w-5 border-white" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default IntegratedChat