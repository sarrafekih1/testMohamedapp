// src/components/layout/MainContent.tsx

import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useTopics } from '../../stores/topicsStore'
import { useDocuments, useDocumentsByTopic } from '../../stores/documentsStore'
import { useHistory } from '../../stores/historyStore'
import { useWorkspace } from '../../stores/workspaceStore'
import { useAuth } from '../../stores/authStore'
import KnowledgeBase from '../workspace/KnowledgeBase'
import IntegratedChat from '../workspace/IntegratedChat'
import TopicHeader, { type TabType } from '../workspace/TopicHeader'
import { PermissionsPanel } from '../permissions/PermissionsPanel'

// ================================
// TYPES
// ================================

interface MainContentProps {
  className?: string
}

// ================================
// COMPOSANT MAIN CONTENT
// ================================

const MainContent: React.FC<MainContentProps> = ({ className = '' }) => {
  const { topicId } = useParams<{ topicId: string }>()
  const { topics, fetchTopicById } = useTopics()
  const { fetchDocuments } = useDocuments()
  const { openHistory } = useHistory()
  const { selectedTopicId, selectTopic } = useWorkspace()
  const { user } = useAuth()

  const documents = useDocumentsByTopic(topicId || '')

  // États locaux
  const [currentTopic, setCurrentTopic] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('messages')

  console.log('🔍 MainContent - topicId:', topicId, 'documents:', documents, 'activeTab:', activeTab)

  // ========================
  // EFFECTS
  // ========================

  useEffect(() => {
    if (topicId && topicId !== selectedTopicId) {
      selectTopic(topicId)
    }
  }, [topicId, selectedTopicId, selectTopic])

  useEffect(() => {
    const loadTopicData = async () => {
      if (!topicId) {
        setCurrentTopic(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        let topic = topics.find(t => t.id === topicId)
        
        if (!topic) {
          topic = await fetchTopicById(topicId)
        }

        setCurrentTopic(topic)

        if (topic) {
          await fetchDocuments(topicId)
        }

      } catch (error: any) {
        console.error('Erreur chargement topic:', error)
        setError(error.message || 'Erreur lors du chargement du topic')
      } finally {
        setIsLoading(false)
      }
    }

    loadTopicData()
  }, [topicId, topics, fetchTopicById, fetchDocuments])

  // ========================
  // HANDLERS
  // ========================

  const handleOpenHistory = () => {
    if (topicId) {
      openHistory(topicId)
    }
  }

  const handleTabChange = (tab: TabType) => {
    console.log('🔄 Changement onglet:', tab)
    setActiveTab(tab)
  }

  const handleNewConversation = async () => {
    console.log('🔵 Création nouvelle conversation pour topic:', topicId)
    
    if (!topicId) {
      console.error('❌ Pas de topicId disponible')
      return
    }
    
    try {
      const { useConversationsStore } = await import('../../stores/conversationsStore')
      await useConversationsStore.getState().createNewConversation(topicId)
      setActiveTab('messages')
      console.log('🟢 Nouvelle conversation créée avec succès')
    } catch (error) {
      console.error('❌ Erreur création nouvelle conversation:', error)
    }
  }

  // ========================
  // COMPUTED VALUES
  // ========================

  const readyDocuments = documents.filter(doc => doc.status === 'ready')
  const hasReadyDocuments = readyDocuments.length > 0
  const canManagePermissions = user?.role === 'admin'

  // ========================
  // RENDER HELPERS
  // ========================

  const renderEmptyState = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          Aucun topic sélectionné
        </h3>
        <p className="text-text-secondary">
          Sélectionnez un topic dans la sidebar pour commencer à travailler avec vos documents.
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
          {error}
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

  const renderLoadingState = () => (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-border-light">
        <div className="flex items-center gap-4">
          <div className="loading-skeleton h-8 w-48 rounded" />
          <div className="loading-skeleton h-6 w-16 rounded-full" />
        </div>
        <div className="loading-skeleton h-10 w-32 rounded-sonam-md" />
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div className="card-knowledge p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="loading-skeleton h-6 w-40 rounded" />
            <div className="loading-skeleton h-8 w-8 rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="loading-skeleton h-24 rounded-sonam-sm" />
            ))}
          </div>
        </div>

        <div className="loading-skeleton h-32 rounded-sonam-lg" />
      </div>
    </div>
  )

  const renderMainContent = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <TopicHeader 
        topic={currentTopic}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenHistory={handleOpenHistory}
        onNewConversation={handleNewConversation}
        hasReadyDocuments={hasReadyDocuments}  
      />

      {/* ✅ Contenu conditionnel selon onglet actif */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'files' && (
          // 📁 ONGLET FICHIERS
          <div className="flex-1 p-6 overflow-y-auto">
            <KnowledgeBase topicId={topicId!} />
          </div>
        )}

        {activeTab === 'messages' && (
          // 💬 ONGLET MESSAGES
          <div className="flex-1 min-h-0 flex flex-col">
            <IntegratedChat 
              topicId={topicId!}
              hasReadyDocuments={hasReadyDocuments}
              disabled={!hasReadyDocuments}
              className="flex-1"
            />
          </div>
        )}

        {activeTab === 'permissions' && (
          // 🔐 ONGLET PERMISSIONS
          <div className="flex-1 p-6 overflow-y-auto">
            {canManagePermissions ? (
              <PermissionsPanel
                topicId={topicId!}
                currentUserPermission={user?.role === 'admin' ? 'global_admin' : 'read'}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    Accès refusé
                  </h3>
                  <p className="text-text-secondary">
                    Vous n'avez pas les permissions pour gérer les accès de ce topic.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // ========================
  // RENDER PRINCIPAL
  // ========================

  return (
    <div className={`main-content ${className}`}>
      {isLoading && renderLoadingState()}
      {error && !isLoading && renderErrorState()}
      {!topicId && !isLoading && !error && renderEmptyState()}
      {currentTopic && !isLoading && !error && renderMainContent()}
    </div>
  )
}

export default MainContent