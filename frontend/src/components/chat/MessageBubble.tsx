// src/components/chat/MessageBubble.tsx
import React from 'react'
import { User, Bot, FileText, Clock, Zap } from 'lucide-react'
import { useMessageSources } from '../../hooks/useChat'
import type { Message } from '../../types/api'  // ✅ CORRIGÉ

interface MessageBubbleProps {
  message: Message
  onSourceClick?: (documentId: string, documentName: string) => void
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSourceClick
}) => {
  const { hasSource, sources, uniqueDocuments } = useMessageSources(message)
  const isUser = message.is_from_user
  const isAI = !message.is_from_user

  // Formatage de l'heure
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Formatage du temps de traitement
  const formatProcessingTime = (timeMs?: number) => {
    if (!timeMs) return ''
    if (timeMs < 1000) return `${timeMs}ms`
    return `${(timeMs / 1000).toFixed(1)}s`
  }

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-4xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium
            ${isUser 
              ? 'bg-primary-600' 
              : 'bg-gradient-to-r from-purple-600 to-blue-600'
            }
          `}>
            {isUser ? <User size={16} /> : <Bot size={16} />}
          </div>
        </div>

        {/* Bulle de message */}
        <div className={`
          rounded-2xl px-4 py-3 max-w-3xl relative
          ${isUser 
            ? 'bg-primary-600 text-white' 
            : 'bg-white border border-gray-200 text-gray-900'
          }
          shadow-sm
        `}>
          
          {/* Contenu du message */}
          <div className="whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>

          {/* Sources pour les messages IA */}
          {isAI && hasSource && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1 mb-2">
                <FileText size={14} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-600">
                  Sources citées:
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {uniqueDocuments.map((doc, index) => (
                  <button
                    key={`${doc.documentId}-${index}`}
                    onClick={() => onSourceClick?.(doc.documentId, doc.name)}
                    className="
                      inline-flex items-center gap-1 px-2 py-1 
                      bg-blue-50 hover:bg-blue-100 
                      text-blue-700 hover:text-blue-800
                      text-xs rounded-md border border-blue-200
                      transition-colors cursor-pointer
                    "
                    title={`Voir le document: ${doc.name} (Topic: ${doc.topicName})`}
                  >
                    <FileText size={12} />
                    <span className="truncate max-w-32">
                      {doc.name.length > 20 ? doc.name.substring(0, 20) + '...' : doc.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Métadonnées pour les messages IA */}
          {isAI && (message.processing_time || message.token_count) && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {message.processing_time && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{formatProcessingTime(message.processing_time)}</span>
                  </div>
                )}
                {message.token_count && (
                  <div className="flex items-center gap-1">
                    <Zap size={12} />
                    <span>{message.token_count} tokens</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className={`
            text-xs mt-2 
            ${isUser ? 'text-primary-200' : 'text-gray-400'}
          `}>
            {formatTime(message.created_at)}
          </div>

          {/* Queue de bulle */}
          <div className={`
            absolute top-4 w-3 h-3 transform rotate-45
            ${isUser 
              ? 'bg-primary-600 -right-1.5' 
              : 'bg-white border-l border-t border-gray-200 -left-1.5'
            }
          `} />
        </div>
      </div>
    </div>
  )
}

export default MessageBubble