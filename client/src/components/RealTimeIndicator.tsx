import React from 'react';
import { Wifi } from 'lucide-react';

interface RealTimeIndicatorProps {
  className?: string;
}

export default function RealTimeIndicator({ className = '' }: RealTimeIndicatorProps) {
  return (
    <div className={`flex items-center space-x-1 text-xs text-green-600 dark:text-green-400 ${className}`}>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <Wifi className="w-3 h-3" />
      <span className="font-medium">Live</span>
    </div>
  );
}
