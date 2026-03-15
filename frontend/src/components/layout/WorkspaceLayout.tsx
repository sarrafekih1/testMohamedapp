// src/components/layout/WorkspaceLayout.tsx
import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom' // ← AJOUTER useLocation
import Sidebar from './Sidebar'
import MainContent from './MainContent'
import HistorySidebar from '../workspace/HistorySidebar'
import { useWorkspace } from '../../stores/workspaceStore'
import { useHistory } from '../../stores/historyStore'

// ================================
// TYPES
// ================================

interface WorkspaceLayoutProps {
  className?: string
}

// ================================
// COMPOSANT WORKSPACE LAYOUT
// ================================

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ className = '' }) => {
  const location = useLocation() // ← AJOUTER
  const {
    sidebarCollapsed,
    sidebarMobileOpen,
    handleResize,
    isMobile
  } = useWorkspace()
  const { isOpen: historyOpen } = useHistory()

  // ========================
  // COMPUTED VALUES
  // ========================

  // ← NOUVEAU : Déterminer si on doit afficher MainContent ou Outlet
  const isTopicRoute = location.pathname.includes('/workspace/topic/') || location.pathname === '/workspace'
  const shouldShowMainContent = isTopicRoute

  // ========================
  // EFFECTS
  // ========================

  // Gestion responsive
  useEffect(() => {
    const handleWindowResize = () => {
      handleResize(window.innerWidth)
    }

    handleWindowResize()
    window.addEventListener('resize', handleWindowResize)
    
    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [handleResize])

  // Empêcher le scroll du body quand sidebar mobile ouverte
  useEffect(() => {
    if (isMobile() && sidebarMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [sidebarMobileOpen, isMobile])

  // ========================
  // RENDER
  // ========================

  return (
    <div className={`workspace-layout ${className}`}>
      {/* Sidebar principale */}
      <Sidebar />

      {/* Zone de contenu principal - CONDITIONNEL */}
      {shouldShowMainContent ? (
        // Route topic : afficher MainContent
        <MainContent />
      ) : (
        // Autres routes : afficher via Outlet (UserManagementPage, etc.)
        <div className="main-content">
          <Outlet />
        </div>
      )}

      {/* Sidebar historique (conditionnelle) */}
      {historyOpen && <HistorySidebar />}
    </div>
  )
}

export default WorkspaceLayout