import { motion } from 'framer-motion';
import React from 'react';
import { motionProps } from './motion-utils';

interface BackgroundEffectsProps {
  count?: number;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  sizeRange?: [number, number];
  speedRange?: [number, number];
  seed?: number;
}

// Simple pseudo-random number generator with seed
function seededRandom(seed: number): () => number {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({
  count = 20,
  primaryColor = 'rgba(168, 85, 247, 0.5)',
  secondaryColor = 'rgba(253, 224, 71, 0.5)',
  tertiaryColor = 'rgba(59, 130, 246, 0.5)',
  sizeRange = [50, 200],
  speedRange = [8, 20],
  seed
}) => {
  // Generate random blobs
  const blobs = React.useMemo(() => {
    // Use seeded random if seed is provided, otherwise use Math.random
    const random = seed !== undefined ? seededRandom(seed) : Math.random;
    
    return Array.from({ length: count }).map((_, i) => {
      const size = sizeRange[0] + random() * (sizeRange[1] - sizeRange[0]);
      const position = {
        top: `${random() * 100}%`,
        left: `${random() * 100}%`,
      };
      const delay = random() * 2;
      const duration = speedRange[0] + random() * (speedRange[1] - speedRange[0]);
      const color = i % 3 === 0 ? primaryColor : i % 3 === 1 ? secondaryColor : tertiaryColor;
      
      return { size, position, delay, duration, color };
    });
  }, [count, primaryColor, secondaryColor, tertiaryColor, sizeRange, speedRange, seed]);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      zIndex: 1,
      pointerEvents: 'none'
    }}>
      {blobs.map((blob, index) => (
        <motion.div
          key={index}
          {...motionProps({
            initial: { y: 50, opacity: 0 },
            animate: {
              y: 0,
              opacity: 0.8,
              rotate: [0, 10, -10, 0],
              transition: {
                delay: blob.delay,
                duration: 0.8,
                ease: 'easeInOut',
                rotate: {
                  repeat: Infinity,
                  duration: blob.duration,
                  ease: 'linear',
                },
              },
            },
            style: {
              position: 'absolute',
              top: blob.position.top,
              left: blob.position.left,
              width: `${blob.size}px`,
              height: `${blob.size}px`,
              background: blob.color,
              borderRadius: '50%',
              filter: 'blur(30px)',
              mixBlendMode: 'lighten',
              zIndex: 2
            }
          })}
        />
      ))}
    </div>
  );
};

export default BackgroundEffects;