export default function StatsCard({ title, value, change, changeType, color = 'blue', icon: Icon }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
  };

  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${colors[color]}`}>
          {Icon && <Icon className="h-6 w-6" />}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-2xl font-bold text-gray-900">{value}</dd>
          </dl>
        </div>
      </div>
      {change && (
        <div className="mt-4">
          <div className={`text-sm ${changeColors[changeType || 'neutral']}`}>
            {change}
          </div>
        </div>
      )}
    </div>
  );
}
