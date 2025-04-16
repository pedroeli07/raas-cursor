'use client';

import { cn } from '@/lib/utils/utils';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { motionProps } from './motion-utils';

interface InfiniteMovingCardsProps {
  items: {
    href: string;
    alt: string;
    title?: string;
  }[];
  direction?: 'left' | 'right';
  speed?: 'fast' | 'normal' | 'slow';
  pauseOnHover?: boolean;
  style?: React.CSSProperties;
  imageStyle?: React.CSSProperties;
  cardStyle?: React.CSSProperties;
  className?: string;
}

const InfiniteMovingCards = ({
  items,
  direction = 'left',
  speed = 'fast',
  pauseOnHover = true,
  style = {},
  imageStyle = {},
  cardStyle = {},
  className,
}: InfiniteMovingCardsProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});

  // Função para registrar erros de imagem
  const handleImageError = (src: string, error: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`Erro ao carregar imagem: ${src}`, error);
    setImageErrors(prev => ({
      ...prev,
      [src]: true
    }));
  };

  useEffect(() => {
    addAnimation();
  }, []);

  const [start, setStart] = useState(false);

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }

  const getDirection = () => {
    if (containerRef.current) {
      if (direction === 'left') {
        containerRef.current.style.setProperty(
          '--animation-direction',
          'forwards'
        );
      } else {
        containerRef.current.style.setProperty(
          '--animation-direction',
          'reverse'
        );
      }
    }
  };

  const getSpeed = () => {
    if (containerRef.current) {
      if (speed === 'fast') {
        containerRef.current.style.setProperty('--animation-duration', '20s');
      } else if (speed === 'normal') {
        containerRef.current.style.setProperty('--animation-duration', '30s');
      } else {
        containerRef.current.style.setProperty('--animation-duration', '50s');
      }
    }
  };

  const speedMap = {
    fast: 25,
    normal: 40,
    slow: 60,
  };

  const directionMap = {
    left: 'forwards',
    right: 'reverse',
  };

  const allItems = [...items, ...items];

  return (
    <div 
      ref={containerRef}
      className={cn('relative w-full mt-8 overflow-hidden', className)}
      style={{
        width: '100%',
        padding: '64px 0',
        overflow: 'hidden',
        background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
        maxWidth: '1200px',
        margin: '0 auto',
        borderRadius: '12px',
        position: 'relative',
        maskImage: 'linear-gradient(to right, transparent, white 20%, white 80%, transparent)',
        ...style
      }}
    >
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 16px'
      }}>
        <motion.div
          {...motionProps({
            initial: { y: 50, opacity: 0 },
            whileInView: { y: 0, opacity: 1 },
            transition: { duration: 0.8, ease: 'easeInOut' },
            style: {
              textAlign: 'center',
              marginBottom: '60px'
            }
          })}
        >
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '10px'
          }}>
            Tem um telhado sem uso ?
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: '#64748b'
          }}>
            Transforme seu galpão em fonte de renda
          </p>
        </motion.div>

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex',
            gap: '16px',
            overflow: 'hidden'
          }}>
            <motion.div
              {...motionProps({
                initial: { x: 0 },
                animate: { x: '-100%' },
                transition: {
                  repeat: Infinity,
                  duration: speedMap[speed],
                  ease: 'linear',
                  repeatType: 'loop',
                  direction: directionMap[direction]
                },
                style: {
                  display: 'flex',
                  gap: '16px',
                  whiteSpace: 'nowrap'
                },
                whileHover: { animationPlayState: pauseOnHover ? 'paused' : 'running' }
              })}
            >
              {allItems.map((item, index) => (
                <motion.div
                  key={`${item.href}-${index}`}
                  {...motionProps({
                    style: {
                      flexShrink: 0,
                      width: '256px',
                      height: '160px',
                      borderRadius: '8px',
                      background: '#1a2942',
                      padding: '24px',
                      color: 'white',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      position: 'relative',
                      overflow: 'hidden',
                      ...cardStyle
                    },
                    whileHover: { scale: 1.05, transition: { duration: 0.3 } }
                  })}
                >
                  {/* Efeito de gradiente */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.3,
                    background: 'linear-gradient(to bottom right, #34d399, #3b82f6)'
                  }}></div>
                  
                  {/* Imagem */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                  }}>
                    {!imageErrors[item.href] ? (
                      <img
                        src={item.href}
                        alt={item.alt}
                        style={{
                          objectFit: 'cover',
                          ...imageStyle,
                          width: '100%',
                          height: '100%'
                        }}
                        onError={(e) => handleImageError(item.href, e)}
                        
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(to bottom right, #1a2942, #0A1628)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '1rem',
                          color: '#64748b'
                        }}>{item.alt}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Overlay com gradiente */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, #0A1628, transparent)',
                    opacity: 0.8
                  }}></div>
                  
                  {/* Título (se fornecido) */}
                  {item.title && (
                    <div style={{
                      position: 'absolute',
                      bottom: '24px',
                      left: '24px',
                      right: '24px',
                      color: 'white',
                      fontSize: '1.25rem',
                      fontWeight: 'bold'
                    }}>
                      {item.title}
                    </div>
                  )}
                  
                  {/* Efeito de brilho no canto */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    marginTop: '-24px',
                    marginRight: '-24px',
                    width: '64px',
                    height: '64px',
                    background: '#34d399',
                    borderRadius: '50%',
                    filter: 'blur(20px)',
                    opacity: 0.5
                  }}></div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfiniteMovingCards;