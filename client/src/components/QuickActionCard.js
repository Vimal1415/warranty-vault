import React from 'react';
import { Link } from 'react-router-dom';

const QuickActionCard = ({ title, description, icon: Icon, href, onClick, color = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600 hover:bg-primary-100',
    success: 'bg-success-50 text-success-600 hover:bg-success-100',
    warning: 'bg-warning-50 text-warning-600 hover:bg-warning-100',
    secondary: 'bg-gray-50 text-gray-600 hover:bg-gray-100'
  };

  const content = (
    <div className="card hover:shadow-lg transition-shadow cursor-pointer">
      <div className="card-body">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return <div onClick={onClick}>{content}</div>;
};

export default QuickActionCard; 