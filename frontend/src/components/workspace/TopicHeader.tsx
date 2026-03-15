// src/components/workspace/TopicHeader.tsx

import React from 'react'
import { Clock, Settings, MoreVertical, MessageSquare, FolderOpen, MessageSquarePlus, Shield } from 'lucide-react'
import { useAuth } from '../../stores/authStore'
import type { Topic } from '../../types/api'

// ================================
// TYPES
// ================================

export type TabType = 'messages' | 'files' | 'permissions'  // ✅ AJOUTÉ 'permissions'

interface TopicHeaderProps {
  topic: Topic | null
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  onOpenHistory: () => void
  onNewConversation: () => void
  hasReadyDocuments: boolean
  className?: string
}

// ================================
// COMPOSANT TOPIC HEADER
// ================================

const TopicHeader: React.FC<TopicHeaderProps> = ({
  topic,
  activeTab,
  onTabChange,
  onOpenHistory,
  onNewConversation,
  hasReadyDocuments,
  className = ''
}) => {
  const { user } = useAuth()  // ✅ AJOUTÉ

  // ✅ AJOUTÉ - Vérifier permissions
  const canManagePermissions = user?.role === 'admin'

  // ========================
  // HANDLERS
  // ========================

  const handleSettingsClick = () => {
    console.log('Ouvrir paramètres topic:', topic?.id)
  }

  const handleNewConversation = () => {
    onNewConversation()
  }

  // ========================
  // RENDER HELPERS
  // ========================

  const renderTopicBadge = () => {
    if (!topic) return null
    
    return topic.is_active ? (
      <span className="badge-active">
        Actif
      </span>
    ) : (
      <span className="badge-inactive">
        Inactif
      </span>
    )
  }

  const renderTopicInfo = () => {
    if (!topic) {
      return (
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Topic non trouvé
          </h1>
          <p className="text-text-secondary mt-1">
            Le topic demandé n'existe pas ou vous n'y avez pas accès.
          </p>
        </div>
      )
    }

    return (
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-text-primary truncate">
            {topic.name}
          </h1>
          {renderTopicBadge()}
        </div>
        
        {topic.description && (
          <p className="text-text-secondary line-clamp-2">
            {topic.description}
          </p>
        )}
      </div>
    )
  }

  const renderActions = () => {
    if (!topic) return null
    
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleNewConversation}
          disabled={!hasReadyDocuments}
          className="btn-sonam-secondary flex items-center gap-2"
          title="Créer une nouvelle conversation"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouveau chat</span>
        </button>

        <button
          onClick={onOpenHistory}
          className="btn-sonam-secondary flex items-center gap-2"
          title="Voir l'historique des conversations"
        >
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Historique</span>
        </button>

        <button
          onClick={handleSettingsClick}
          className="btn-sonam-ghost p-3"
          title="Paramètres du topic"
        >
          <Settings className="h-4 w-4" />
        </button>

        <button
          className="btn-sonam-ghost p-3"
          title="Plus d'actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const renderTabNavigation = () => {
    if (!topic) return null

    return (
      <nav className="tabs-container mt-4 -mb-px">
        <button
          onClick={() => onTabChange('messages')}
          className={`tab-button ${
            activeTab === 'messages' ? 'tab-button-active' : 'tab-button-inactive'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Messages</span>
          </div>
        </button>

        <button
          onClick={() => onTabChange('files')}
          className={`tab-button ${
            activeTab === 'files' ? 'tab-button-active' : 'tab-button-inactive'
          }`}
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span>Fichiers</span>
          </div>
        </button>

        {/* ✅ NOUVEL ONGLET PERMISSIONS */}
        {canManagePermissions && (
          <button
            onClick={() => onTabChange('permissions')}
            className={`tab-button ${
              activeTab === 'permissions' ? 'tab-button-active' : 'tab-button-inactive'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Permissions</span>
            </div>
          </button>
        )}
      </nav>
    )
  }

  // ========================
  // RENDER PRINCIPAL
  // ========================

  return (
    <header className={`flex flex-col gap-4 p-6 border-b border-border-light bg-white ${className}`}>
      <div className="flex items-start justify-between gap-4">
        {renderTopicInfo()}
        {renderActions()}
      </div>
      {renderTabNavigation()}
    </header>
  )
}

export default TopicHeader