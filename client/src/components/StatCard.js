import React from 'react';
import { LucideIcon } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color = 'primary', change, changeType = 'neutral' }) => {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600 border-primary-200',
    success: 'bg-success-50 text-success-600 border-success-200',
    warning: 'bg-warning-50 text-warning-600 border-warning-200',
    danger: 'bg-danger-50 text-danger-600 border-danger-200',
    secondary: 'bg-gray-50 text-gray-600 border-gray-200'
  };

  const changeColorClasses = {
    positive: 'text-success-600',
    negative: 'text-danger-600',
    neutral: 'text-gray-600'
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className={`text-sm ${changeColorClasses[changeType]}`}>
                {changeType === 'positive' && '+'}
                {change}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard; 