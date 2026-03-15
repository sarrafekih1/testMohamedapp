// src/components/permissions/PermissionUserCard.tsx
import React from 'react'
import { Mail, Calendar, User as UserIcon } from 'lucide-react'
import { PermissionBadge } from '../ui/PermissionBadge'
import type { TopicPermission } from '../../types/api'

interface PermissionUserCardProps {
  permission: TopicPermission
  canManage: boolean
  onModify: (permission: TopicPermission) => void
  onRevoke: (permission: TopicPermission) => void
}

export const PermissionUserCard: React.FC<PermissionUserCardProps> = ({
  permission,
  canManage,
  onModify,
  onRevoke
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header avec avatar et badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {permission.user.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          
          {/* Nom */}
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {permission.user.full_name}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {permission.user.email}
            </p>
          </div>
        </div>

        {/* Badge permission */}
        <PermissionBadge permission={permission.permission} />
      </div>

      {/* Métadonnées */}
      <div className="space-y-2 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4" />
          <span>
            Accordé par {permission.grantor?.full_name || 'Système'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>
            Le {new Date(permission.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={() => onModify(permission)}
            className="flex-1 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
          >
            Modifier
          </button>
          
          <button
            onClick={() => onRevoke(permission)}
            className="flex-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
          >
            Révoquer
          </button>
        </div>
      )}
    </div>
  )
}