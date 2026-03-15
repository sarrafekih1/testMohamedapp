// src/components/layout/Sidebar.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Folder, 
  ChevronDown, 
  Settings, 
  User, 
  Users,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useAuth } from '../../stores/authStore'
import { useTopics } from '../../stores/topicsStore'
import { useWorkspace, workspaceStore } from '../../stores/workspaceStore'
import CreateTopicModal from '../topics/CreateTopicModal'

// ================================
// TYPES
// ================================

interface SidebarProps {
  className?: string
}

// ================================
// COMPOSANT SIDEBAR PRINCIPAL
// ================================

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { topics, fetchTopics, isLoading: topicsLoading } = useTopics()
  const {
    sidebarCollapsed,
    sidebarMobileOpen,
    selectedTopicId,
    showProfileDropdown,
    toggleSidebar,
    toggleMobileSidebar,
    closeMobileSidebar,
    selectTopic,
    toggleProfileDropdown,
    closeProfileDropdown,
    isMobile,
    isTablet,
    isDesktop
  } = useWorkspace()

  // États locaux
  const [showCreateModal, setShowCreateModal] = useState(false)

  // ========================
  // EFFECTS
  // ========================

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  // Fermer dropdown profil en cliquant ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProfileDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.profile-dropdown-container')) {
          closeProfileDropdown()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileDropdown, closeProfileDropdown])

  // Gestion responsive - CORRIGÉ ✅
  useEffect(() => {
    const handleResize = () => {
      // ✅ Utilise workspaceStore.getState() pour accéder à handleResize
      workspaceStore.getState().handleResize(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Appel initial
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ========================
  // HANDLERS
  // ========================

  const handleTopicClick = (topicId: string) => {
    selectTopic(topicId)
    navigate(`/workspace/topic/${topicId}`)
    
    // Fermer la sidebar mobile après sélection
    if (isMobile()) {
      closeMobileSidebar()
    }
  }

  const handleNewTopic = () => {
    setShowCreateModal(true)
    closeProfileDropdown()
  }

  const handleTopicCreated = (newTopic: any) => {
    setShowCreateModal(false)
    handleTopicClick(newTopic.id)
  }

  const handleProfileAction = (action: 'settings' | 'profile' | 'logout' | 'users') => {
      closeProfileDropdown()
      
      switch (action) {
        case 'settings':
          navigate('/workspace/settings')
          break
        case 'profile':
          navigate('/workspace/profile')
          break
        case 'users': // ← NOUVEAU
          navigate('/workspace/users')
          break
        case 'logout':
          logout()
          navigate('/login')
          break
      }
    }

  // ========================
  // RENDER HELPERS
  // ========================

  const renderTopicItem = (topic: any) => {
    const isActive = selectedTopicId === topic.id
    const isCollapsed = sidebarCollapsed && !isMobile()

    return (
      <button
        key={topic.id}
        onClick={() => handleTopicClick(topic.id)}
        className={`
          ${isActive ? 'sidebar-item-active' : 'sidebar-item'}
          ${isCollapsed ? 'justify-center px-2' : ''}
          group relative
        `}
        title={isCollapsed ? topic.name : undefined}
      >
        <Folder className="h-5 w-5 flex-shrink-0" />
        {!isCollapsed && (
          <span className="truncate text-sm font-medium">
            {topic.name}
          </span>
        )}
        
        {/* Tooltip pour mode collapsed */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
            {topic.name}
          </div>
        )}
      </button>
    )
  }

  const renderProfileDropdown = () => (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-sonam-md shadow-dropdown border border-border-light overflow-hidden animate-scale-up">
        <button
          onClick={() => handleProfileAction('profile')}
          className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-gray-50 transition-colors"
        >
          <User className="h-4 w-4" />
          <span className="text-sm">Mon Profil</span>
        </button>
        
        <button
          onClick={() => handleProfileAction('settings')}
          className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-gray-50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span className="text-sm">Réglages</span>
        </button>
        
        {/* ← NOUVEAU : Lien Gestion Utilisateurs pour ADMIN/MANAGER */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <>
            <hr className="border-border-light" />
            <button
              onClick={() => handleProfileAction('users')}
              className="w-full flex items-center gap-3 px-4 py-3 text-text-primary hover:bg-gray-50 transition-colors"
            >
              <Users className="h-4 w-4" />
              <span className="text-sm">Gestion Utilisateurs</span>
            </button>
          </>
        )}
        
        <hr className="border-border-light" />
        
        <button
          onClick={() => handleProfileAction('logout')}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Déconnexion</span>
        </button>
      </div>
    )

  // ========================
  // CLASSES CONDITIONNELLES
  // ========================

  const sidebarClasses = `
    sidebar-main
    ${sidebarCollapsed && !isMobile() ? 'sidebar-collapsed' : ''}
    ${isMobile() ? (sidebarMobileOpen ? '' : 'sidebar-hidden') : ''}
    ${className}
  `

  // ========================
  // RENDER
  // ========================

  return (
    <>
      {/* Overlay mobile */}
      {isMobile() && sidebarMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={sidebarClasses}>
        {/* Header avec toggle */}
        <div className="flex items-center justify-between p-4 border-b border-white border-opacity-10">
          {!sidebarCollapsed && (
            <h1 className="text-xl font-bold text-white">
              SONAM RAG
            </h1>
          )}
          
          {/* Toggle button - visible sur desktop, X sur mobile */}
          <button
            onClick={isMobile() ? closeMobileSidebar : toggleSidebar}
            className="p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-sonam-sm transition-colors"
          >
            {isMobile() ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Bouton Nouveau Topic */}
        {/* Bouton Nouveau Topic - Uniquement pour ADMIN et MANAGER */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <div className="p-3">
            <button
              onClick={handleNewTopic}
              className={`
                btn-sonam-accent w-full
                ${sidebarCollapsed && !isMobile() ? 'px-2 py-2' : 'py-3'}
                flex items-center justify-center gap-2
              `}
              title={sidebarCollapsed ? 'Nouveau Topic' : undefined}
            >
              <Plus className="h-5 w-5 flex-shrink-0" />
              {(!sidebarCollapsed || isMobile()) && (
                <span className="font-medium">Nouveau Topic</span>
              )}
            </button>
          </div>
        )}

        {/* Liste des Topics */}
        <div className="flex-1 overflow-y-auto scrollbar-sonam">
          {topicsLoading ? (
            <div className="p-3">
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="loading-skeleton h-10 rounded-sonam-md" />
                ))}
              </div>
            </div>
          ) : topics.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-white text-opacity-70 text-sm">
                Aucun topic créé
              </p>
            </div>
          ) : (
            <div className="py-2">
              {topics.map(renderTopicItem)}
            </div>
          )}
        </div>

        {/* Zone Profil */}
        <div className="relative profile-dropdown-container px-3 pb-3">
          {showProfileDropdown && renderProfileDropdown()}
          
          <button
            onClick={toggleProfileDropdown}
            className={`
              sidebar-profile w-full relative
              ${sidebarCollapsed && !isMobile() ? 'p-2' : ''}
            `}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Avatar */}
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium text-lg">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>

              {/* Info utilisateur */}
              {(!sidebarCollapsed || isMobile()) && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white font-medium text-sm truncate">
                    {user?.full_name || 'Utilisateur'}
                  </p>
                  <p className="text-white text-opacity-70 text-xs truncate">
                    {user?.role === 'admin' ? 'Administrateur' : 
                     user?.role === 'manager' ? 'Manager' : 'Utilisateur'}
                  </p>
                </div>
              )}

              {/* Chevron */}
              {(!sidebarCollapsed || isMobile()) && (
                <ChevronDown 
                  className={`
                    h-4 w-4 text-white transition-transform duration-200 flex-shrink-0
                    ${showProfileDropdown ? 'rotate-180' : ''}
                  `} 
                />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu toggle - visible uniquement sur mobile quand sidebar fermée */}
      {isMobile() && !sidebarMobileOpen && (
        <button
          onClick={toggleMobileSidebar}
          className="fixed top-4 left-4 z-50 p-3 bg-sonam-primary text-white rounded-sonam-md shadow-lg"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {/* Modal Création Topic */}
      {showCreateModal && (
        <CreateTopicModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onTopicCreated={handleTopicCreated}
        />
      )}
    </>
  )
}

export default Sidebar