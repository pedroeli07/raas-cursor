'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { motionProps } from './motion-utils';

interface ImageCarouselProps {
  images: {
    src: string;
    alt: string;
    title?: string;
    description?: string;
  }[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

const ImageCarousel = ({
  images,
  autoPlay = true,
  autoPlayInterval = 5000,
  className,
}: ImageCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 para direita, -1 para esquerda
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  }, [images.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > 50) { // Threshold para considerar um swipe
      if (diff > 0) {
        // Swipe para a esquerda
        handleNext();
      } else {
        // Swipe para a direita
        handlePrev();
      }
    }

    // Reset
    touchStartX.current = null;
    touchEndX.current = null;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoPlay) {
      interval = setInterval(handleNext, autoPlayInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoPlay, autoPlayInterval, images.length, handleNext]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '1200px', 
      height: '500px',
      overflow: 'hidden',
      borderRadius: '12px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
      margin: '0 auto'
    }}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          {...motionProps({
            custom: direction,
            variants: variants,
            initial: "enter",
            animate: "center",
            exit: "exit",
            transition: {
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.5 },
            },
            style: {
              position: 'absolute',
              width: '100%',
              height: '100%',
            }
          })}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img
              src={images[currentIndex].src}
              alt={images[currentIndex].alt}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                position: 'absolute'
              }}
            />
            {/* Texto sobreposto */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'end',
              padding: '32px',
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)',
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '16px',
              }}>
                {images[currentIndex].title}
              </h3>
              <p style={{
                fontSize: '16px',
                color: 'white',
                opacity: 0.9,
                maxWidth: '600px',
              }}>
                {images[currentIndex].description}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'center',
        gap: '8px'
      }}>
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: index === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.3s ease'
            }}
          />
        ))}
      </div>

      <button
        onClick={handlePrev}
        style={{
          position: 'absolute',
          left: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(0, 0, 0, 0.3)',
          color: 'white',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.3s ease',
          fontSize: '20px'
        }}
      >
        ←
      </button>
      <button
        onClick={handleNext}
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(0, 0, 0, 0.3)',
          color: 'white',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.3s ease',
          fontSize: '20px'
        }}
      >
        →
      </button>
    </div>
  );
};

export default ImageCarousel;