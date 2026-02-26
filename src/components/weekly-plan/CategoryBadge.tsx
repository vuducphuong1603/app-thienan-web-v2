'use client'

import { PlanCategory } from '@/lib/supabase'

interface CategoryBadgeProps {
  category?: PlanCategory | null
  size?: 'sm' | 'md'
}

export default function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
  if (!category) return null

  return (
    <div className={`inline-flex items-center gap-1.5 ${size === 'md' ? 'text-xs' : 'text-[11px]'}`}>
      <span
        className={`rounded-full flex-shrink-0 ${size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'}`}
        style={{ backgroundColor: category.color }}
      />
      <span className="text-gray-600 dark:text-gray-400 font-medium">
        {category.name}
      </span>
    </div>
  )
}
