// src/components/documents/DocumentList.tsx
import React from 'react'
import { FileText, Download, Trash2, Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react'
import { useDocumentsStore } from '../../stores/documentsStore'
import type { Document } from '../../types/api'

interface DocumentListProps {
  topicId: string
  documents: Document[]
  onDelete?: (documentId: string) => void
}

export const DocumentList: React.FC<DocumentListProps> = ({ 
  topicId, 
  documents, 
  onDelete 
}) => {
  const { deleteDocument, isLoading } = useDocumentsStore()

  const handleDelete = async (documentId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      try {
        await deleteDocument(documentId, topicId)
        onDelete?.(documentId)
      } catch (error) {
        console.error('Erreur suppression:', error)
      }
    }
  }

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (status: Document['status']) => {
    switch (status) {
      case 'ready':
        return 'Prêt'
      case 'processing':
        return 'Traitement...'
      case 'error':
        return 'Erreur'
      case 'uploading':
        return 'Upload...'
      default:
        return 'Inconnu'
    }
  }

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'ready':
        return 'text-green-700 bg-green-100'
      case 'processing':
        return 'text-yellow-700 bg-yellow-100'
      case 'error':
        return 'text-red-700 bg-red-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun document</h3>
        <p className="text-gray-600">Commencez par télécharger vos premiers documents.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {Array.isArray(documents) && documents.map((doc) => (

        <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {doc.original_filename}
                  </h4>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(doc.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {getStatusText(doc.status)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>•</span>
                  <span>{formatDate(doc.created_at)}</span>
                  {doc.total_chunks > 0 && (
                    <>
                      <span>•</span>
                      <span>{doc.total_chunks} chunks</span>
                    </>
                  )}
                </div>

                {doc.error_message && (
                  <p className="text-xs text-red-600 mt-1">{doc.error_message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {doc.status === 'ready' && (
                <button
                  className="p-2 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                  title="Voir les détails"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}