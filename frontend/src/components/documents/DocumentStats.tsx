// src/components/documents/DocumentStats.tsx
import React from 'react'
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useDocumentStats } from '../../stores/documentsStore'

interface DocumentStatsProps {
  topicId?: string
}

export const DocumentStats: React.FC<DocumentStatsProps> = ({ topicId }) => {
  const stats = useDocumentStats(topicId)

  const statsItems = [
    {
      label: 'Total',
      value: stats.total,
      icon: FileText,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      label: 'Prêts',
      value: stats.ready,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100'
    },
    {
      label: 'En traitement',
      value: stats.processing,
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-100'
    },
    {
      label: 'Erreurs',
      value: stats.error,
      icon: AlertCircle,
      color: 'text-red-600 bg-red-100'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statsItems.map((item) => (
        <div key={item.label} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">{item.label}</p>
              <p className="text-lg font-semibold text-gray-900">{item.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}