// src/components/chat/MessageList.tsx
import React, { useEffect, useRef, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { useAutoScroll } from '../../hooks/useChat'
import type { Message } from '../../types/api'  // ✅ CORRIGÉ

interface MessageListProps {
  messages: Message[]
  isTyping?: boolean
  typingText?: string
  onSourceClick?: (documentId: string, documentName: string) => void
  className?: string
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping = false,
  typingText,
  onSourceClick,
  className = ''
}) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [userHasScrolled, setUserHasScrolled] = useState(false)
  const { messagesEndRef } = useAutoScroll(messages.length)

  // Gestion du scroll automatique
  useEffect(() => {
    if (!userHasScrolled && messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }, [messages.length, isTyping, userHasScrolled])

  // Détecter si l'utilisateur a scrollé manuellement
  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    
    const container = messagesContainerRef.current
    const isAtBottom = Math.abs(
      container.scrollHeight - container.scrollTop - container.clientHeight
    ) < 10

    setUserHasScrolled(!isAtBottom)
  }

  // Reset scroll detection when new conversation is loaded
  useEffect(() => {
    setUserHasScrolled(false)
  }, [messages.length === 0]) // Quand une nouvelle conversation se charge

  // Bouton retour en bas
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
      setUserHasScrolled(false)
    }
  }

  return (
    <div className={`flex-1 relative ${className}`}>
      
      {/* Zone de messages avec scroll */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto px-4 py-6"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E0 transparent'
        }}
      >
        
        {/* Messages vides */}
        {messages.length === 0 && !isTyping && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 max-w-md">
              <div className="mb-4 text-6xl">💬</div>
              <h3 className="text-lg font-medium mb-2">Commencez une conversation</h3>
              <p className="text-sm">
                Posez une question sur les documents de ce topic pour obtenir des réponses précises et sourcées.
              </p>
            </div>
          </div>
        )}

        {/* Liste des messages */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSourceClick={onSourceClick}
          />
        ))}

        {/* Indicateur de frappe */}
        <TypingIndicator 
          isVisible={isTyping}
          text={typingText}
        />

        {/* Marqueur fin des messages pour auto-scroll */}
        <div 
          id="messages-end"
          ref={messagesEndRef}
          style={{ height: '1px' }}
        />
      </div>

      {/* Bouton retour en bas */}
      {userHasScrolled && (
        <button
          onClick={scrollToBottom}
          className="
            absolute bottom-4 right-4 w-10 h-10 
            bg-primary-600 hover:bg-primary-700 text-white 
            rounded-full shadow-lg hover:shadow-xl
            flex items-center justify-center
            transition-all duration-200 transform hover:scale-105
            z-10
          "
          title="Aller au dernier message"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 14l-7 7m0 0l-7-7m7 7V3" 
            />
          </svg>
        </button>
      )}

      {/* Overlay de scroll pour mobile */}
      <div 
        className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none lg:hidden"
        style={{ 
          background: userHasScrolled 
            ? 'linear-gradient(to top, rgba(249, 250, 251, 0.9), transparent)' 
            : 'transparent' 
        }}
      />
    </div>
  )
}

export default MessageList