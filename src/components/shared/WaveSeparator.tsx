// src/components/global/WaveSeparator.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { motionProps } from './motion-utils';

interface WaveSeparatorProps {
  flip?: boolean;
  color?: string;
  height?: number;
  animatedElements?: boolean;
  className?: string;
}

const WaveSeparator: React.FC<WaveSeparatorProps> = ({ 
  flip = false, 
  color = '#ffffff', 
  height = 120,
  animatedElements = true,
  className = '',
}) => {
  return (
    <div className={`absolute ${flip ? 'top-0' : 'bottom-0'} left-0 w-full overflow-hidden leading-[0] z-10 ${className}`}>
      <svg
        className={`relative block w-full ${flip ? 'rotate-180' : ''}`}
        style={{ height: `${height}px` }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          d="M0,0V120H1200V0C1031.19,114.6,859.31,74.55,709.2,51.85
             C570.14,31.35,421.6,73,321.39,56.15
             C174.07,39.28,29.87,60.48,0,80"
          fill={color}
        ></motion.path>
      </svg>
      
      {/* Elementos solares decorativos */}
      {animatedElements && (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              {...motionProps({
                className: "absolute rounded-full",
                style: {
                  width: i % 2 === 0 ? 8 : 12,
                  height: i % 2 === 0 ? 8 : 12,
                  left: `${15 + i * 20}%`,
                  background: i % 2 === 0 
                    ? 'radial-gradient(circle, rgba(52, 211, 153, 0.4) 0%, rgba(52, 211, 153, 0.1) 100%)' 
                    : 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  boxShadow: i % 2 === 0 
                    ? '0 0 10px rgba(52, 211, 153, 0.3)' 
                    : '0 0 10px rgba(59, 130, 246, 0.2)'
                },
                animate: {
                  y: flip ? [5, -10, 5] : [-10, 5, -10],
                  opacity: [0.4, 0.7, 0.4],
                },
                transition: {
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WaveSeparator;