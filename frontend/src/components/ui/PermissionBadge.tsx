// src/components/ui/PermissionBadge.tsx
import React from 'react'
import { Eye, Edit, Key } from 'lucide-react'
import type { PermissionLevel } from '../../types/api'

interface PermissionBadgeProps {
  permission: PermissionLevel
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showTooltip?: boolean
}

export const PermissionBadge: React.FC<PermissionBadgeProps> = ({
  permission,
  size = 'md',
  showIcon = true,
  showTooltip = true
}) => {
  const config = {
    read: {
      icon: Eye,
      label: 'Lecture',
      color: 'bg-gray-100 text-gray-800',
      description: 'Consultation des documents uniquement'
    },
    write: {
      icon: Edit,
      label: 'Écriture',
      color: 'bg-blue-100 text-blue-800',
      description: 'Consultation + Upload de documents'
    },
    admin: {
      icon: Key,
      label: 'Admin',
      color: 'bg-purple-100 text-purple-800',
      description: 'Toutes permissions + Gestion des accès'
    }
  }

  const { icon: Icon, label, color, description } = config[permission]
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  }

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium ${color} ${sizeClasses[size]}`}
      title={showTooltip ? description : undefined}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  )
}