//src/components/workspace/KnowledgeBase.tsx

import React, { useState, useCallback } from 'react'
import { Plus, FileText, Trash2, AlertCircle, CheckCircle, Clock, Upload } from 'lucide-react'
import { useDocuments, useDocumentsByTopic } from '../../stores/documentsStore'
import type { Document } from '../../types/api'

// ================================
// TYPES - INTERFACE MODIFIÉE
// ================================

interface KnowledgeBaseProps {
  topicId: string
  className?: string
  // ✅ Supprimé: documents: Document[]
}

interface FileCardProps {
  document: Document
  onDelete: (documentId: string) => void
}

// ================================
// COMPOSANT FILE CARD (identique)
// ================================

const FileCard: React.FC<FileCardProps> = ({ document, onDelete }) => {
  const [showDelete, setShowDelete] = useState(false)

    console.log('📄 FileCard document:', document)


  const getStatusIcon = () => {
    switch (document.status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />
    }
  }

  const getFileExtension = (filename: string) => {
      if (!filename) return 'FILE'  // ✅ Protection défensive
    return filename.split('.').pop()?.toUpperCase() || 'FILE'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(document.id)
  }

  return (
    <div 
      className="card-file group min-w-[200px] max-w-[250px]"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-sonam-primary" />
          {getStatusIcon()}
        </div>
        
        {showDelete && (
          <button
            onClick={handleDeleteClick}
            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
            title="Supprimer le document"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <h4 className="font-medium text-text-primary text-sm mb-2 line-clamp-2 leading-tight">
        {document.original_filename}
      </h4>

      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span className="font-medium bg-gray-100 px-2 py-1 rounded">
          {getFileExtension(document.original_filename || document.filename || '')}
        </span>
        <span>{formatFileSize(document.file_size)}</span>
      </div>

      <div className="mt-2 text-xs text-text-light">
        {document.status === 'ready' && document.total_chunks && (
          <span>{document.total_chunks} chunk{document.total_chunks > 1 ? 's' : ''}</span>
        )}
        {document.status === 'processing' && (
          <span className="text-yellow-600">Traitement en cours...</span>
        )}
        {document.status === 'error' && (
          <span className="text-red-600" title={document.error_message}>
            Erreur de traitement
          </span>
        )}
      </div>
    </div>
  )
}

// ================================
// COMPOSANT UPLOAD ZONE (identique)
// ================================

const UploadZone: React.FC<{ onUpload: (files: FileList) => void; isUploading: boolean }> = ({ 
  onUpload, 
  isUploading 
}) => {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      onUpload(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onUpload(files)
    }
    e.target.value = ''
  }

  return (
    <div 
      className={`
        card-file min-w-[200px] max-w-[250px] 
        border-2 border-dashed cursor-pointer transition-all duration-200
        ${isDragOver ? 'border-sonam-primary bg-sonam-primary bg-opacity-5' : 'border-border-light hover:border-sonam-primary'}
        ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isUploading && document.getElementById('file-upload')?.click()}
    >
      <div className="flex flex-col items-center justify-center h-full text-center py-4">
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center mb-3
          ${isDragOver ? 'bg-sonam-primary text-white' : 'bg-gray-100 text-gray-400'}
        `}>
          {isUploading ? (
            <div className="loading-spinner h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </div>
        
        <p className="text-sm font-medium text-text-primary mb-1">
          {isUploading ? 'Upload en cours...' : 'Ajouter un document'}
        </p>
        
        <p className="text-xs text-text-secondary">
          {isDragOver 
            ? 'Relâchez pour uploader'
            : 'Glissez-déposez ou cliquez'
          }
        </p>
      </div>

      <input
        id="file-upload"
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  )
}

// ================================
// COMPOSANT KNOWLEDGE BASE - MODIFIÉ
// ================================

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  topicId,
  className = ''
}) => {
  // ✅ Récupération autonome des documents depuis le store
  const { uploadDocument, deleteDocument, isUploading } = useDocuments()
  const documents = useDocumentsByTopic(topicId)

  // ✅ Debug log pour voir ce qui se passe
  console.log('🔍 KnowledgeBase - topicId:', topicId, 'documents:', documents)

  // ========================
  // HANDLERS (identiques)
  // ========================

  const handleUpload = useCallback(async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        await uploadDocument(topicId, file)
      } catch (error: any) {
        console.error('Erreur upload:', error)
      }
    }
  }, [topicId, uploadDocument])

  const handleDelete = useCallback(async (documentId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      try {
        await deleteDocument(documentId, topicId)
      } catch (error: any) {
        console.error('Erreur suppression:', error)
      }
    }
  }, [deleteDocument, topicId])

  // ========================
  // RENDER HELPERS (identiques)
  // ========================

  const renderDocumentCount = () => {
    const count = documents.length
    return (
      <span className="text-text-secondary">
        {count} document{count !== 1 ? 's' : ''}
      </span>
    )
  }

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FileText className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">
        Aucun document
      </h3>
      <p className="text-text-secondary max-w-sm">
        Ajoutez vos premiers documents pour commencer à poser des questions à votre assistant IA.
      </p>
    </div>
  )

  // ========================
  // RENDER PRINCIPAL (identique)
  // ========================

  return (
    <div className={`card-knowledge ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            Base de connaissances
          </h2>
          {renderDocumentCount()}
        </div>
      </div>

      {/* ✅ TOUJOURS afficher la zone upload + documents */}
      <div className="flex gap-4 overflow-x-auto scrollbar-sonam pb-4">
        <UploadZone onUpload={handleUpload} isUploading={isUploading} />
        
        {documents.map(document => (
          <FileCard
            key={document.id}
            document={document}
            onDelete={handleDelete}
          />
        ))}
        
        {/* ✅ Message si aucun document APRÈS la zone upload */}
        {documents.length === 0 && !isUploading && (
          <div className="flex-1 flex items-center justify-center text-center py-8 min-w-[300px]">
            <div>
              <p className="text-text-secondary text-sm">
                Ajoutez vos premiers documents<br/>pour commencer à discuter
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default KnowledgeBase