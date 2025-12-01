import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function EmptyState({
  title = 'No data found',
  description = 'Try adjusting your filters or search query.',
  icon = <MagnifyingGlassIcon className="w-12 h-12 text-gray-300" aria-hidden="true" />,
  action,
  className = ''
}) {
  return (
    <div className={`card p-10 text-center ${className}`}>
      <div className="flex flex-col items-center gap-4">
        {icon}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md">{description}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
