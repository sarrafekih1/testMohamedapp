// src/components/chat/MessageInput.tsx
import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, AlertCircle } from 'lucide-react'
import { useSendMessage } from '../../hooks/useChat'

interface MessageInputProps {
  placeholder?: string
  disabled?: boolean
  onSend?: (message: string) => void
}

export const MessageInput: React.FC<MessageInputProps> = ({
  placeholder = "Tapez votre message...",
  disabled = false,
  onSend
}) => {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { send, isSending, validationError, clearValidationError, canSend } = useSendMessage()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [message])

  // Gestion envoi message
  const handleSend = async () => {
    if (!message.trim() || isSending || disabled) return

    const messageToSend = message.trim()
    console.log('🔵 SEND MESSAGE FROM INPUT:', messageToSend.substring(0, 50) + '...')
    
    // Callback optionnel
    onSend?.(messageToSend)
    
    // Envoi via hook
    const success = await send(messageToSend)
    
    if (success) {
      setMessage('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  // Gestion touche Entrée
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Nettoyage erreur lors de la saisie
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)
    
    if (validationError) {
      clearValidationError()
    }
  }

  const isDisabled = disabled || isSending || !canSend
  const hasError = !!validationError
  
  return (
    <div className="border-t bg-white p-4">
      
      {/* Erreur de validation */}
      {hasError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-sm text-red-700">{validationError}</span>
        </div>
      )}

      <div className="flex items-end gap-3">
        
        {/* Zone de saisie */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className={`
              w-full px-4 py-3 pr-12 border rounded-2xl resize-none
              focus:outline-none focus:ring-2 transition-colors
              min-h-[48px] max-h-32 overflow-y-auto
              ${hasError
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }
              ${isDisabled 
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-gray-900'
              }
            `}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#CBD5E0 transparent'
            }}
          />
          
          {/* Compteur caractères */}
          <div className="absolute bottom-1 right-3 text-xs text-gray-400">
            {message.length}/10000
          </div>
        </div>

        {/* Bouton d'envoi */}
        <button
          onClick={handleSend}
          disabled={isDisabled || !message.trim()}
          className={`
            flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 transform
            ${(!message.trim() || isDisabled)
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg hover:scale-105'
            }
          `}
          title={
            isSending 
              ? 'Envoi en cours...' 
              : !canSend
              ? 'Aucune conversation sélectionnée'
              : 'Envoyer le message (Entrée)'
          }
        >
          {isSending ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>

      {/* Aide utilisateur */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span>Entrée pour envoyer, Shift+Entrée pour nouvelle ligne</span>
        {isSending && (
          <div className="flex items-center gap-1 text-primary-600">
            <Loader2 size={12} className="animate-spin" />
            <span>Génération en cours (~30s)...</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageInput