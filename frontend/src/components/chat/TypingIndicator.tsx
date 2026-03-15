// src/components/chat/TypingIndicator.tsx

import React from 'react'
import { Bot } from 'lucide-react'

interface TypingIndicatorProps {
  text?: string
  isVisible: boolean
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  text = 'L\'IA réfléchit...', 
  isVisible 
}) => {
  if (!isVisible) return null

  return (
    <div className="flex w-full mb-4 justify-start">
      <div className="flex max-w-4xl">
        
        {/* Avatar IA */}
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-r from-purple-600 to-blue-600">
            <Bot size={16} />
          </div>
        </div>

        {/* Bulle de frappe */}
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm relative">
          
          {/* Texte de statut */}
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-sm italic">{text}</span>
            
            {/* Animation points de frappe */}
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" 
                   style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" 
                   style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" 
                   style={{ animationDelay: '300ms' }} />
            </div>
          </div>

          {/* Queue de bulle */}
          <div className="absolute top-4 w-3 h-3 transform rotate-45 bg-white border-l border-t border-gray-200 -left-1.5" />
        </div>
      </div>
    </div>
  )
}

export default TypingIndicator