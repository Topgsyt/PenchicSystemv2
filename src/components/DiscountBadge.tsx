import React from 'react';
import { Tag, Gift, Percent, DollarSign } from 'lucide-react';

interface DiscountBadgeProps {
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'bundle';
  value: number;
  buyQuantity?: number;
  getQuantity?: number;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const DiscountBadge: React.FC<DiscountBadgeProps> = ({
  type,
  value,
  buyQuantity,
  getQuantity,
  className = '',
  size = 'medium'
}) => {
  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base'
  };

  const getIcon = () => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-3 h-3" />;
      case 'fixed_amount':
        return <DollarSign className="w-3 h-3" />;
      case 'buy_x_get_y':
        return <Gift className="w-3 h-3" />;
      case 'bundle':
        return <Tag className="w-3 h-3" />;
      default:
        return <Tag className="w-3 h-3" />;
    }
  };

  const getBadgeText = () => {
    switch (type) {
      case 'percentage':
        return `${value}% OFF`;
      case 'fixed_amount':
        return `KES ${value} OFF`;
      case 'buy_x_get_y':
        return `Buy ${buyQuantity} Get ${getQuantity}`;
      case 'bundle':
        return `${value}% Bundle`;
      default:
        return 'OFFER';
    }
  };

  const getBadgeColor = () => {
    switch (type) {
      case 'percentage':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'fixed_amount':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'buy_x_get_y':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'bundle':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  return (
    <span className={`
      inline-flex items-center gap-1 font-bold rounded-full shadow-lg transform hover:scale-105 transition-all
      ${getBadgeColor()}
      ${sizeClasses[size]}
      ${className}
    `}>
      {getIcon()}
      {getBadgeText()}
    </span>
  );
};

export default DiscountBadge;