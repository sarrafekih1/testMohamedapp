// src/pages/TopicDetailPage.tsx - Version complète avec Permissions
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, FileText, MessageSquare, Calendar, User, Hash, MessageCircle, Plus, Shield } from 'lucide-react'
import { useTopicById, useTopicsStore } from '../stores/topicsStore'
import { useDocumentsStore, useDocumentsByTopic, useDocumentStats } from '../stores/documentsStore'
import { useAuthStore } from '../stores/authStore'
import { DocumentUpload } from '../components/documents/DocumentUpload'
import { DocumentList } from '../components/documents/DocumentList'
import { DocumentStats } from '../components/documents/DocumentStats'
import { useChat } from '../hooks/useChat'
import { ChatInterface } from '../components/chat/ChatInterface'
import { PermissionsPanel } from '../components/permissions/PermissionsPanel'
import type { Topic } from '../types/api'

export const TopicDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  console.log('🔍 DEBUG - user:', user)
console.log('🔍 DEBUG - user.role:', user?.role)
console.log('🔍 DEBUG - canManagePermissions:', user?.role === 'admin')

  // Données calculées
  const topic = useTopicById(id || '')
  const documents = useDocumentsByTopic(id || '') || []
  const stats = useDocumentStats(id)
  const readyDocuments = documents.filter(doc => doc.status === 'ready')
  const hasReadyDocuments = readyDocuments.length > 0

  const { fetchDocuments, deleteDocument, isLoading: isLoadingDocuments } = useDocumentsStore()
  const { fetchTopicById, topics, isLoading: isLoadingTopic } = useTopicsStore()
  
  // State local
  const [activeTab, setActiveTab] = useState<'documents' | 'chat' | 'permissions'>('documents')

  // Chat store
  const { fetchConversations, createConversation, conversations } = useChat()

  // Permissions
  const canManagePermissions = user?.role === 'admin' // TODO: Ajouter vérification ADMIN topic

  // Chargement des données
  useEffect(() => {
    if (id) {
      if (!topic) {
        console.log('🔄 Topic non trouvé, rechargement...', id)
        fetchTopicById(id)
      }
      
      console.log('🔄 Chargement documents pour topic:', id)
      fetchDocuments(id)
      
      console.log('🔄 Chargement conversations pour topic:', id)
      fetchConversations()
    }
  }, [id, topic, fetchTopicById, fetchDocuments, fetchConversations])

  // Rafraîchissement documents en processing
  useEffect(() => {
    if (!id) return

    const interval = setInterval(() => {
      const processingDocs = documents.filter(doc => doc.status === 'processing')
      if (processingDocs.length > 0) {
        console.log('🔄 Rafraîchissement des documents en processing...')
        fetchDocuments(id)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [id, documents, fetchDocuments])

  // Gestion suppression document
  const handleDeleteDocument = async (documentId: string) => {
    if (!id) return
    
    const confirm = window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')
    if (confirm) {
      await deleteDocument(documentId, id)
    }
  }

  // Gestion création nouvelle conversation
  const handleNewConversation = async () => {
    if (!topic || !hasReadyDocuments) return
    
    const title = prompt('Titre de la conversation (optionnel):') || `Discussion - ${topic.name}`
    
    try {
      await createConversation({
        topic_ids: [topic.id],
        title
      })
      setActiveTab('chat')
    } catch (error) {
      console.error('❌ Erreur création conversation:', error)
    }
  }

  // Gestion clic sur source dans le chat
  const handleSourceClick = (documentId: string, documentName: string) => {
    console.log('🔵 Source cliquée:', documentName, 'Document ID:', documentId)
    setActiveTab('documents')
  }

  // Loading states
  if (isLoadingTopic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du topic...</p>
        </div>
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Topic non trouvé
          </h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-primary-600 hover:text-primary-700"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-1 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{topic.name}</span>
          </div>

          {/* Titre et informations */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{topic.name}</h1>
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${topic.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                  }
                `}>
                  {topic.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              
              {topic.description && (
                <p className="text-gray-600">{topic.description}</p>
              )}
            </div>

            {/* Actions rapides */}
            <div className="flex items-center gap-2">
              {hasReadyDocuments && (
                <button
                  onClick={handleNewConversation}
                  className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  <MessageCircle size={16} />
                  Nouvelle conversation
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('documents')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                flex items-center gap-2
                ${activeTab === 'documents'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <FileText size={16} />
              Documents ({stats.total})
            </button>
            
            <button
              onClick={() => setActiveTab('chat')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                flex items-center gap-2
                ${activeTab === 'chat'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                ${!hasReadyDocuments && 'opacity-50 cursor-not-allowed'}
              `}
              disabled={!hasReadyDocuments}
              title={!hasReadyDocuments ? 'Uploadez des documents pour activer le chat' : 'Interface conversationnelle'}
            >
              <MessageSquare size={16} />
              Conversations ({conversations.length})
            </button>

            {/* Tab Permissions */}
            {canManagePermissions && (
              <button
                onClick={() => setActiveTab('permissions')}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  flex items-center gap-2
                  ${activeTab === 'permissions'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Shield size={16} />
                Permissions
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Documents */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Stats et Upload */}
            <div className="lg:col-span-1 space-y-6">
              {/* Statistiques */}
              <DocumentStats topicId={id} />

              {/* Informations topic */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-medium text-gray-900 mb-4">Informations</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-gray-600">Créé par vous</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-600">
                      {new Date(topic.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash size={16} className="text-gray-400" />
                    <span className="text-gray-600 font-mono text-xs">{topic.slug}</span>
                  </div>
                </div>
              </div>

              {/* Zone d'upload */}
              <DocumentUpload topicId={id || ''} />
            </div>

            {/* Zone principale - Liste documents */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-medium text-gray-900">
                    Documents ({documents.length})
                  </h2>
                </div>
                
                {isLoadingDocuments ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des documents...</p>
                  </div>
                ) : (
                  <DocumentList
                    topicId={id || ''}
                    documents={documents}
                    onDelete={handleDeleteDocument}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Chat */}
        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-12rem)]">
            {hasReadyDocuments ? (
              <div className="bg-white rounded-lg shadow-sm h-full">
                <ChatInterface
                  topic={topic}
                  onSourceClick={handleSourceClick}
                  onClose={() => setActiveTab('documents')}
                  className="h-full"
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center h-full flex items-center justify-center">
                <div className="max-w-md mx-auto">
                  <MessageSquare className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Chat indisponible
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Vous devez d'abord uploader et traiter des documents dans ce topic pour pouvoir 
                    commencer une conversation intelligente.
                  </p>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    <Plus size={16} />
                    Ajouter des documents
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Permissions */}
        {activeTab === 'permissions' && (
          <div>
            {canManagePermissions ? (
              <PermissionsPanel
                topicId={id || ''}
                currentUserPermission={user?.role === 'admin' ? 'global_admin' : 'read'}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Shield className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Accès refusé
                </h3>
                <p className="text-gray-600">
                  Vous n'avez pas les permissions pour gérer les accès de ce topic.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}