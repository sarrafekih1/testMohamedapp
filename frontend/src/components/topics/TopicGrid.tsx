// src/components/topics/TopicGrid.tsx - CORRIGÉ
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2 } from 'lucide-react'
import { TopicCard } from './TopicCard'
import CreateTopicModal from './CreateTopicModal' // ← CORRECTION : sans accolades
import { useTopicsStore } from '../../stores/topicsStore'
import type { Topic } from '../../types/api'

interface TopicGridProps {
  onTopicClick?: (topic: Topic) => void
}

export const TopicGrid: React.FC<TopicGridProps> = ({ onTopicClick }) => {
  const navigate = useNavigate()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { topics, isLoading, error } = useTopicsStore()

  const handleTopicClick = (topic: Topic) => {
    if (onTopicClick) {
      onTopicClick(topic)
    } else {
      navigate(`/topics/${topic.id}`)
    }
  }

  const handleTopicCreated = (topic: Topic) => {
    console.log('Topic créé:', topic)
    setIsCreateModalOpen(false)
    // Navigation automatique vers le nouveau topic
    handleTopicClick(topic)
  }

  if (isLoading && topics.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des topics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Bouton créer nouveau topic */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary-400 hover:bg-primary-50 transition-colors flex flex-col items-center justify-center min-h-[160px] group"
        >
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary-200 transition-colors">
            <Plus className="h-5 w-5 text-primary-600" />
          </div>
          <h3 className="font-medium text-gray-900 mb-1">Nouveau Topic</h3>
          <p className="text-sm text-gray-500 text-center">
            Créer un nouveau dossier thématique
          </p>
        </button>

        {/* Liste des topics existants */}
        {topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            documentCount={0}
            conversationCount={0}
            onClick={() => handleTopicClick(topic)}
          />
        ))}
      </div>

      {/* Modale création topic */}
      <CreateTopicModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTopicCreated={handleTopicCreated} // ← CORRECTION : nom de prop correct
      />
    </div>
  )
}