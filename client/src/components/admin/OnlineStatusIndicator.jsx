import React from 'react';
import { motion } from 'framer-motion';

export default function OnlineStatusIndicator({ isOnline, size = 'sm', showLabel = false }) {
  const sizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <motion.div
          className={`${sizes[size]} rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
          animate={isOnline ? {
            scale: [1, 1.2, 1],
          } : {}}
          transition={isOnline ? {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          } : {}}
        />
        {isOnline && (
          <motion.div
            className={`absolute top-0 left-0 ${sizes[size]} rounded-full bg-green-400 opacity-75`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.75, 0, 0.75],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-lime-100/50'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}