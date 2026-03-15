// src/components/topics/CreateTopicModal.tsx
import React, { useState, useEffect } from 'react'
import { X, Folder, AlertCircle } from 'lucide-react'
import { useTopics } from '../../stores/topicsStore'
import type { TopicCreate } from '../../types/api'

// ================================
// TYPES
// ================================

interface CreateTopicModalProps {
  isOpen: boolean
  onClose: () => void
  onTopicCreated?: (topic: any) => void
  className?: string
}

// ✅ CORRECTION - Interface avec description obligatoire pour éviter undefined
interface FormData {
  name: string
  description: string // Obligatoire dans le form, sera converti vers TopicCreate
}

// ================================
// COMPOSANT CREATE TOPIC MODAL
// ================================

const CreateTopicModal: React.FC<CreateTopicModalProps> = ({
  isOpen,
  onClose,
  onTopicCreated,
  className = ''
}) => {
  const { createTopic, isLoading, error, clearError } = useTopics()

  // États locaux - ✅ description initialisée à string vide
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '' // Plus jamais undefined
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // ========================
  // EFFECTS
  // ========================

  // Reset form quand modal s'ouvre/ferme
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', description: '' })
      setValidationErrors({})
      clearError()
    }
  }, [isOpen, clearError])

  // Gestion Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  // ========================
  // HANDLERS
  // ========================

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Validation nom
    if (!formData.name.trim()) {
      errors.name = 'Le nom du topic est requis'
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Le nom doit contenir au moins 2 caractères'
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Le nom ne peut pas dépasser 100 caractères'
    }

    // Validation description (optionnelle) - ✅ Plus de problème undefined
    if (formData.description && formData.description.length > 500) {
      errors.description = 'La description ne peut pas dépasser 500 caractères'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      // ✅ CORRECTION - Conversion FormData vers TopicCreate
      const topicData: TopicCreate = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined // Conversion explicite
      }

      const newTopic = await createTopic(topicData)

      // Succès
      onTopicCreated?.(newTopic)
      handleClose()
    } catch (error) {
      // L'erreur est gérée par le store
      console.error('Erreur création topic:', error)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // ========================
  // RENDER HELPERS
  // ========================

  const renderError = (field: string) => {
    const errorMessage = validationErrors[field]
    if (!errorMessage) return null

    return (
      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
        <AlertCircle className="h-4 w-4" />
        {errorMessage}
      </p>
    )
  }

  const renderGlobalError = () => {
    if (!error) return null

    return (
      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-sonam-md">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  // ========================
  // RENDER PRINCIPAL
  // ========================

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-xs"
        onClick={handleOverlayClick}
      />

      {/* Modal */}
      <div className={`
        relative w-full max-w-md mx-4 bg-white rounded-sonam-lg shadow-sonam
        animate-scale-up
        ${className}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sonam-primary rounded-sonam-md flex items-center justify-center">
              <Folder className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Nouveau Topic
              </h2>
              <p className="text-sm text-text-secondary">
                Créez un nouveau domaine de connaissances
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-sonam-sm transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {renderGlobalError()}

          {/* Nom du topic */}
          <div className="mb-4">
            <label htmlFor="topic-name" className="block text-sm font-medium text-text-primary mb-2">
              Nom du topic <span className="text-red-500">*</span>
            </label>
            <input
              id="topic-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ex: Ressources Humaines, Finance..."
              className={`
                input-sonam
                ${validationErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              `}
              disabled={isLoading}
              maxLength={100}
              autoComplete="off"
              autoFocus
            />
            {renderError('name')}
            <p className="mt-1 text-xs text-text-light">
              {formData.name.length}/100 caractères
            </p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="topic-description" className="block text-sm font-medium text-text-primary mb-2">
              Description (optionnel)
            </label>
            <textarea
              id="topic-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Décrivez le contenu de ce topic..."
              className={`
                textarea-sonam min-h-[100px]
                ${validationErrors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              `}
              disabled={isLoading}
              maxLength={500}
            />
            {renderError('description')}
            {/* ✅ CORRECTION - Plus de problème undefined */}
            <p className="mt-1 text-xs text-text-light">
              {formData.description.length}/500 caractères
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="btn-sonam-secondary"
            >
              Annuler
            </button>
            
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="btn-sonam-primary flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner h-4 w-4 border-white" />
                  Création...
                </>
              ) : (
                <>
                  <Folder className="h-4 w-4" />
                  Créer le topic
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTopicModal