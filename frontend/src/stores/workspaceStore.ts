// src/stores/workspaceStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ================================
// TYPES WORKSPACE STORE
// ================================

interface WorkspaceStore {
  // État sidebar navigation
  sidebarCollapsed: boolean
  sidebarMobileOpen: boolean
  
  // Topic sélectionné
  selectedTopicId: string | null
  
  // Layout preferences
  historyPanelWidth: number
  knowledgeBaseExpanded: boolean
  
  // UI States
  showProfileDropdown: boolean
  
  // Actions sidebar
  toggleSidebar: () => void
  collapseSidebar: () => void
  expandSidebar: () => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
  
  // Actions topic selection
  selectTopic: (topicId: string) => void
  clearSelectedTopic: () => void
  
  // Actions UI
  toggleProfileDropdown: () => void
  closeProfileDropdown: () => void
  setHistoryPanelWidth: (width: number) => void
  toggleKnowledgeBase: () => void
  
  // Actions responsive
  handleResize: (width: number) => void
  
  // Getters
  isMobile: () => boolean
  isTablet: () => boolean
  isDesktop: () => boolean
}

// ================================
// CONSTANTES
// ================================

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024
const DEFAULT_HISTORY_WIDTH = 384 // 96 en Tailwind (96 * 4px)

// ================================
// STORE WORKSPACE - CORRIGÉ
// ================================

export const workspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      // État initial
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      selectedTopicId: null,
      historyPanelWidth: DEFAULT_HISTORY_WIDTH,
      knowledgeBaseExpanded: true,
      showProfileDropdown: false,

      // ========================
      // ACTIONS SIDEBAR
      // ========================

      toggleSidebar: () => {
        set(state => ({ 
          sidebarCollapsed: !state.sidebarCollapsed 
        }))
      },

      collapseSidebar: () => {
        set({ sidebarCollapsed: true })
      },

      expandSidebar: () => {
        set({ sidebarCollapsed: false })
      },

      toggleMobileSidebar: () => {
        set(state => ({ 
          sidebarMobileOpen: !state.sidebarMobileOpen 
        }))
      },

      closeMobileSidebar: () => {
        set({ sidebarMobileOpen: false })
      },

      // ========================
      // ACTIONS TOPIC
      // ========================

      selectTopic: (topicId: string) => {
        set({ 
          selectedTopicId: topicId,
          // Fermer le menu mobile après sélection
          sidebarMobileOpen: false,
          // Fermer le dropdown profil si ouvert
          showProfileDropdown: false
        })
      },

      clearSelectedTopic: () => {
        set({ selectedTopicId: null })
      },

      // ========================
      // ACTIONS UI
      // ========================

      toggleProfileDropdown: () => {
        set(state => ({ 
          showProfileDropdown: !state.showProfileDropdown 
        }))
      },

      closeProfileDropdown: () => {
        set({ showProfileDropdown: false })
      },

      setHistoryPanelWidth: (width: number) => {
        // Limites min/max pour la largeur du panel historique
        const clampedWidth = Math.max(320, Math.min(width, 500))
        set({ historyPanelWidth: clampedWidth })
      },

      toggleKnowledgeBase: () => {
        set(state => ({ 
          knowledgeBaseExpanded: !state.knowledgeBaseExpanded 
        }))
      },

      // ========================
      // ACTIONS RESPONSIVE
      // ========================

      handleResize: (width: number) => {
        const state = get()
        
        // Gestion automatique selon la largeur d'écran
        if (width < MOBILE_BREAKPOINT) {
          // Mobile: forcer collapse sidebar et fermer mobile menu
          set({ 
            sidebarCollapsed: true,
            sidebarMobileOpen: false,
            showProfileDropdown: false
          })
        } else if (width < TABLET_BREAKPOINT) {
          // Tablet: collapse par défaut mais pas de mobile menu
          set({ 
            sidebarMobileOpen: false,
            showProfileDropdown: false
          })
        } else {
          // Desktop: sidebar peut être expanded
          set({ 
            sidebarMobileOpen: false,
            showProfileDropdown: false
          })
        }
      },

      // ========================
      // GETTERS
      // ========================

      isMobile: () => {
        return window.innerWidth < MOBILE_BREAKPOINT
      },

      isTablet: () => {
        const width = window.innerWidth
        return width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT
      },

      isDesktop: () => {
        return window.innerWidth >= TABLET_BREAKPOINT
      },
    }),
    {
      name: 'workspace-store',
      // Persistance des préférences utilisateur
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        selectedTopicId: state.selectedTopicId,
        historyPanelWidth: state.historyPanelWidth,
        knowledgeBaseExpanded: state.knowledgeBaseExpanded,
        // Note: on ne persiste pas les états temporaires (mobile, dropdown)
      }),
    }
  )
)

// Hook compatible (garde l'ancien nom pour compatibilité)
export const useWorkspaceStore = workspaceStore

// ================================
// HOOKS UTILITAIRES
// ================================

export const useWorkspace = () => {
  const store = useWorkspaceStore()
  return {
    // État
    sidebarCollapsed: store.sidebarCollapsed,
    sidebarMobileOpen: store.sidebarMobileOpen,
    selectedTopicId: store.selectedTopicId,
    historyPanelWidth: store.historyPanelWidth,
    knowledgeBaseExpanded: store.knowledgeBaseExpanded,
    showProfileDropdown: store.showProfileDropdown,
    
    // Actions
    toggleSidebar: store.toggleSidebar,
    collapseSidebar: store.collapseSidebar,
    expandSidebar: store.expandSidebar,
    toggleMobileSidebar: store.toggleMobileSidebar,
    closeMobileSidebar: store.closeMobileSidebar,
    selectTopic: store.selectTopic,
    clearSelectedTopic: store.clearSelectedTopic,
    toggleProfileDropdown: store.toggleProfileDropdown,
    closeProfileDropdown: store.closeProfileDropdown,
    setHistoryPanelWidth: store.setHistoryPanelWidth,
    toggleKnowledgeBase: store.toggleKnowledgeBase,
    handleResize: store.handleResize,
    
    // Getters
    isMobile: store.isMobile,
    isTablet: store.isTablet,
    isDesktop: store.isDesktop,
  }
}

// Hook pour le topic sélectionné uniquement
export const useSelectedTopic = () => {
  return useWorkspaceStore(state => state.selectedTopicId)
}

// Hook pour l'état sidebar uniquement
export const useSidebarState = () => {
  const store = useWorkspaceStore()
  return {
    collapsed: store.sidebarCollapsed,
    mobileOpen: store.sidebarMobileOpen,
    toggle: store.toggleSidebar,
    toggleMobile: store.toggleMobileSidebar,
    close: store.closeMobileSidebar,
  }
}

// Hook pour les préférences layout
export const useLayoutPreferences = () => {
  const store = useWorkspaceStore()
  return {
    historyPanelWidth: store.historyPanelWidth,
    knowledgeBaseExpanded: store.knowledgeBaseExpanded,
    setHistoryPanelWidth: store.setHistoryPanelWidth,
    toggleKnowledgeBase: store.toggleKnowledgeBase,
  }
}

// Hook pour détecter les breakpoints
export const useResponsive = () => {
  const store = useWorkspaceStore()
  return {
    isMobile: store.isMobile(),
    isTablet: store.isTablet(),
    isDesktop: store.isDesktop(),
    handleResize: store.handleResize,
  }
}

export default useWorkspaceStore