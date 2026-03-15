// src/stores/documentsStore.ts
import { create } from 'zustand'
import { apiService } from '../services/api'
import type { Document } from '../types/api'

interface DocumentsStore {
  // State
  documents: Document[]
  documentsByTopic: Record<string, Document[]>
  isLoading: boolean
  isUploading: boolean
  error: string | null
  uploadProgress: number

  // Actions
  fetchDocuments: (topicId: string) => Promise<void>
  uploadDocument: (topicId: string, file: File, onProgress?: (progress: number) => void) => Promise<Document>
  deleteDocument: (documentId: string, topicId: string) => Promise<void>
  clearError: () => void
  resetUpload: () => void
}

export const useDocumentsStore = create<DocumentsStore>((set, get) => ({
  // État initial
  documents: [],
  documentsByTopic: {},
  isLoading: false,
  isUploading: false,
  error: null,
  uploadProgress: 0,

  // FETCH DOCUMENTS
  fetchDocuments: async (topicId: string) => {
    console.log('🔵 FETCH DOCUMENTS START pour topicId:', topicId)
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiService.getDocuments(topicId)
      const documents = response.documents // <- Extraire le tableau depuis l'objet
      console.log('🟢 Documents reçus de l\'API:', documents)
      
      set(state => {
        console.log('🔵 État avant update fetchDocuments:', state)
        
        const newState = {
          documents,
          documentsByTopic: {
            ...state.documentsByTopic,
            [topicId]: documents
          },
          isLoading: false,
          error: null
        }
        
        console.log('🟢 Nouvel état après fetchDocuments:', newState)
        return newState
      })
    } catch (error: any) {
      console.error('🔴 Erreur fetchDocuments:', error)
      const errorMessage = error.response?.data?.detail || 'Erreur lors du chargement des documents'
      set({ 
        error: errorMessage,
        isLoading: false 
      })
    }
  },

  // UPLOAD DOCUMENT
  uploadDocument: async (topicId: string, file: File, onProgress?: (progress: number) => void) => {
    console.log('🔵 UPLOAD START - État initial:', get())
    set({ isUploading: true, error: null, uploadProgress: 0 })
    
    try {
      // Simuler le progrès d'upload
      const progressInterval = setInterval(() => {
        set(state => {
          const newProgress = Math.min(state.uploadProgress + 10, 90)
          onProgress?.(newProgress)
          return { uploadProgress: newProgress }
        })
      }, 200)

      console.log('🔵 Appel API upload...')
      const newDocument = await apiService.uploadDocument(topicId, file)
      console.log('🟢 Document uploadé:', newDocument)
      
      clearInterval(progressInterval)
      
      // Ajouter le document à la liste avec BEAUCOUP de sécurités
      set(state => {
        console.log('🔵 État avant mise à jour:', state)
        
        const topicDocuments = Array.isArray(state.documentsByTopic[topicId]) 
          ? state.documentsByTopic[topicId] 
          : []
        
        const currentDocuments = Array.isArray(state.documents) 
          ? state.documents 
          : []
        
        console.log('🔵 topicDocuments:', topicDocuments)
        console.log('🔵 currentDocuments:', currentDocuments)
        
        const newState = {
          documents: [newDocument, ...currentDocuments],
          documentsByTopic: {
            ...state.documentsByTopic,
            [topicId]: [newDocument, ...topicDocuments]
          },
          isUploading: false,
          uploadProgress: 100,
          error: null
        }
        
        console.log('🟢 Nouvel état:', newState)
        return newState
      })
      
      // Reset progress après 2 secondes
      setTimeout(() => {
        set({ uploadProgress: 0 })
      }, 2000)
      
      return newDocument
    } catch (error: any) {
      console.error('🔴 Erreur upload:', error)
      const errorMessage = error.response?.data?.detail || 'Erreur lors de l\'upload du document'
      set({ 
        error: errorMessage,
        isUploading: false,
        uploadProgress: 0
      })
      throw error
    }
  },

  // DELETE DOCUMENT  
  deleteDocument: async (documentId: string, topicId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      await apiService.deleteDocument(documentId)
      
      // Retirer le document des listes AVEC SÉCURITÉ
      set(state => {
        const currentDocuments = Array.isArray(state.documents) ? state.documents : []
        const currentTopicDocs = Array.isArray(state.documentsByTopic[topicId]) 
          ? state.documentsByTopic[topicId] 
          : []
        
        return {
          documents: currentDocuments.filter(doc => doc.id !== documentId),
          documentsByTopic: {
            ...state.documentsByTopic,
            [topicId]: currentTopicDocs.filter(doc => doc.id !== documentId)
          },
          isLoading: false,
          error: null
        }
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erreur lors de la suppression du document'
      set({ 
        error: errorMessage,
        isLoading: false 
      })
      throw error
    }
  },

  // CLEAR ERROR
  clearError: () => {
    set({ error: null })
  },

  // RESET UPLOAD STATE
  resetUpload: () => {
    set({ 
      isUploading: false, 
      uploadProgress: 0,
      error: null 
    })
  },
}))

// ✅ HOOK EXPORT - C'est ce qui manquait !
export const useDocuments = () => {
  const store = useDocumentsStore()
  return {
    // État
    documents: store.documents,
    documentsByTopic: store.documentsByTopic,
    isLoading: store.isLoading,
    isUploading: store.isUploading,
    error: store.error,
    uploadProgress: store.uploadProgress,
    
    // Actions
    fetchDocuments: store.fetchDocuments,
    uploadDocument: store.uploadDocument,
    deleteDocument: store.deleteDocument,
    clearError: store.clearError,
    resetUpload: store.resetUpload,
  }
}

// Hook utilitaire pour récupérer les documents d'un topic
export const useDocumentsByTopic = (topicId: string) => {
  const documentsByTopic = useDocumentsStore(state => state.documentsByTopic)
  return documentsByTopic[topicId] || []
}

// Hook pour les statistiques de documents
export const useDocumentStats = (topicId?: string) => {
  const { documents, documentsByTopic } = useDocumentsStore()
  
  if (topicId) {
    const topicDocs = documentsByTopic[topicId] || []
    // Vérifier que topicDocs est bien un array
    if (!Array.isArray(topicDocs)) {
      return { total: 0, ready: 0, processing: 0, error: 0 }
    }
    return {
      total: topicDocs.length,
      ready: topicDocs.filter(doc => doc.status === 'ready').length,
      processing: topicDocs.filter(doc => doc.status === 'processing').length,
      error: topicDocs.filter(doc => doc.status === 'error').length
    }
  }
  
  // Pour les documents globaux aussi
  const docsArray = Array.isArray(documents) ? documents : []
  return {
    total: docsArray.length,
    ready: docsArray.filter(doc => doc.status === 'ready').length,
    processing: docsArray.filter(doc => doc.status === 'processing').length,
    error: docsArray.filter(doc => doc.status === 'error').length
  }
}

export default useDocumentsStore