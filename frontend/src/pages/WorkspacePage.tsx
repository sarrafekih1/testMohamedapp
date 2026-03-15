// src/pages/WorkspacePage.tsx

import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, FileText, MessageCircle } from 'lucide-react'
import { useAuth } from '../stores/authStore'
import { useTopics } from '../stores/topicsStore'
import { useWorkspace } from '../stores/workspaceStore'

// ================================
// TYPES
// ================================

interface WorkspacePageProps {
  className?: string
}

// ================================
// COMPOSANT WORKSPACE PAGE
// ================================

const WorkspacePage: React.FC<WorkspacePageProps> = ({ className = '' }) => {
  const { topicId } = useParams<{ topicId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { topics, fetchTopics, isLoading: topicsLoading } = useTopics()
  const { selectedTopicId, selectTopic } = useWorkspace()

  // ========================
  // EFFECTS
  // ========================

  // Charger les topics au montage
  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  // Gestion de la sélection automatique du premier topic
  useEffect(() => {
    // Si un topicId est dans l'URL, le sélectionner
    if (topicId && topicId !== selectedTopicId) {
      selectTopic(topicId)
      return
    }

    // Si pas de topic sélectionné et qu'on a des topics, sélectionner le premier
    if (!selectedTopicId && !topicsLoading && topics.length > 0) {
      const firstTopic = topics[0]
      selectTopic(firstTopic.id)
      navigate(`/workspace/topic/${firstTopic.id}`, { replace: true })
      return
    }

    // Si pas de topic dans l'URL mais un topic sélectionné, mettre à jour l'URL
    if (!topicId && selectedTopicId) {
      navigate(`/workspace/topic/${selectedTopicId}`, { replace: true })
    }
  }, [topicId, selectedTopicId, topics, topicsLoading, selectTopic, navigate])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderWelcomeState = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 bg-gradient-to-br from-sonam-primary to-sonam-active rounded-2xl flex items-center justify-center mx-auto mb-6">
          <MessageCircle className="h-10 w-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          Bienvenue dans SONAM RAG
        </h1>
        
        <p className="text-lg text-text-secondary mb-8 leading-relaxed">
          Votre assistant intelligent pour interroger vos documents d'assurance. 
          Créez votre premier topic pour commencer.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-4 bg-white rounded-sonam-lg border border-border-light">
            <div className="w-10 h-10 bg-sonam-accent rounded-lg flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">
              1. Créez un topic
            </h3>
            <p className="text-sm text-text-secondary">
              Organisez vos documents par domaine (RH, Finance, Juridique...)
            </p>
          </div>

          <div className="p-4 bg-white rounded-sonam-lg border border-border-light">
            <div className="w-10 h-10 bg-sonam-primary rounded-lg flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">
              2. Ajoutez vos documents
            </h3>
            <p className="text-sm text-text-secondary">
              Uploadez vos PDF, Word, Excel pour enrichir la base de connaissances
            </p>
          </div>

          <div className="p-4 bg-white rounded-sonam-lg border border-border-light">
            <div className="w-10 h-10 bg-sonam-active rounded-lg flex items-center justify-center mb-3">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">
              3. Posez vos questions
            </h3>
            <p className="text-sm text-text-secondary">
              Interrogez intelligemment vos documents avec des réponses sourcées
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderLoadingState = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="loading-spinner h-8 w-8 mx-auto mb-4" />
        <p className="text-text-secondary">
          Chargement de votre workspace...
        </p>
      </div>
    </div>
  )

  const renderErrorState = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          Erreur de chargement
        </h3>
        <p className="text-text-secondary mb-4">
          Impossible de charger vos topics. Veuillez réessayer.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-sonam-primary"
        >
          Réessayer
        </button>
      </div>
    </div>
  )

  // ========================
  // RENDER PRINCIPAL
  // ========================

  // Le contenu principal est géré par MainContent via WorkspaceLayout
  // Cette page sert principalement à la logique de routing et états globaux

  if (topicsLoading) {
    return <div className={className}>{renderLoadingState()}</div>
  }

  if (!topicsLoading && topics.length === 0) {
    return <div className={className}>{renderWelcomeState()}</div>
  }

  // Si on a des topics et la logique de routing fonctionne,
  // le contenu sera affiché via MainContent
  return <div className={className} />
}

export default WorkspacePage