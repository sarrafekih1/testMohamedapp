// src/components/topics/TopicCard.tsx
import React from 'react'
import { Folder, FileText, MessageSquare, Calendar } from 'lucide-react'
import type { Topic } from '../../types/api'

interface TopicCardProps {
  topic: Topic
  documentCount?: number
  conversationCount?: number
  onClick?: () => void
}

export const TopicCard: React.FC<TopicCardProps> = ({ 
  topic, 
  documentCount = 0, 
  conversationCount = 0,
  onClick 
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
            <Folder className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
              {topic.name}
            </h3>
            <p className="text-sm text-gray-500">
              Créé le {formatDate(topic.created_at)}
            </p>
          </div>
        </div>
        
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          topic.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {topic.is_active ? 'Actif' : 'Inactif'}
        </div>
      </div>

      {topic.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {topic.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{documentCount} docs</span>
          </div>
          <div className="flex items-center space-x-1">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{conversationCount} conv</span>
          </div>
        </div>

        <button className="text-primary-600 hover:text-primary-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Ouvrir →
        </button>
      </div>
    </div>
  )
}


