// src/components/documents/DocumentUpload.tsx
import React, { useState, useRef } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useDocumentsStore } from '../../stores/documentsStore'

interface DocumentUploadProps {
  topicId: string
  onUploadSuccess?: (document: any) => void
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
  topicId, 
  onUploadSuccess 
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadDocument, isUploading, uploadProgress, error, resetUpload } = useDocumentsStore()

  const allowedTypes = ['.pdf', '.docx', '.txt', '.xlsx']
  const maxFileSize = 100 * 1024 * 1024 // 100MB

  const validateFile = (file: File) => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(extension)) {
      throw new Error(`Type de fichier non supporté. Types acceptés: ${allowedTypes.join(', ')}`)
    }
    
    if (file.size > maxFileSize) {
      throw new Error('Fichier trop volumineux. Taille maximale: 100MB')
    }
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    
    try {
      validateFile(file)
      resetUpload()
      
      const uploadedDoc = await uploadDocument(topicId, file, (progress) => {
        console.log('Upload progress:', progress)
      })
      
      onUploadSuccess?.(uploadedDoc)
    } catch (error: any) {
      console.error('Upload error:', error.message)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const getProgressColor = () => {
    if (uploadProgress === 100) return 'bg-green-500'
    if (error) return 'bg-red-500'
    return 'bg-primary-500'
  }

  return (
    <div className="space-y-4">
      {/* Zone d'upload */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver 
            ? 'border-primary-400 bg-primary-50' 
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
          ${isUploading ? 'cursor-not-allowed opacity-75' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={isUploading}
        />

        <div className="space-y-3">
          {!isUploading ? (
            <>
              <div className="mx-auto w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Télécharger un document</h3>
                <p className="text-sm text-gray-600">
                  Glissez-déposez votre fichier ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Formats acceptés: {allowedTypes.join(', ')} (max 100MB)
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center animate-pulse">
                <Upload className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Téléchargement en cours...</h3>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">{uploadProgress}%</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={resetUpload}
              className="text-xs text-red-600 hover:text-red-800 mt-1"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Succès */}
      {uploadProgress === 100 && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
          <CheckCircle2 className="h-5 w-5 text-green-500 mr-3" />
          <p className="text-sm text-green-700">Document téléchargé avec succès !</p>
        </div>
      )}
    </div>
  )
}



