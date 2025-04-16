'use client';

import React, { ReactNode } from 'react';
import { motion, Variant } from 'framer-motion';
import { motionProps } from './motion-utils';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  once?: boolean;
  staggerChildren?: boolean;
  staggerDelay?: number;
  style?: React.CSSProperties;
}

const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 0.5,
  className = '',
  direction = 'up',
  distance = 20,
  once = true,
  staggerChildren = false,
  staggerDelay = 0.1,
  style,
}) => {
  // Configurações de variantes baseadas na direção
  const getInitialVariant = (): Variant => {
    const variant: Variant = { opacity: 0 };
    
    switch (direction) {
      case 'up':
        variant.y = distance;
        break;
      case 'down':
        variant.y = -distance;
        break;
      case 'left':
        variant.x = distance;
        break;
      case 'right':
        variant.x = -distance;
        break;
      case 'none':
      default:
        break;
    }
    
    return variant;
  };
  
  // Variantes de animação
  const variants = {
    hidden: getInitialVariant(),
    visible: { 
      opacity: 1, 
      y: 0, 
      x: 0,
      transition: {
        duration,
        delay,
        ease: 'easeOut',
        when: "beforeChildren",
        staggerChildren: staggerChildren ? staggerDelay : 0
      }
    }
  };
  
  // Variantes para filhos, se aplicável
  const childVariants = staggerChildren ? {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  } : {};
  
  const ChildWrapper = staggerChildren
    ? ({ children }: { children: ReactNode }) => (
        <motion.div {...motionProps({ variants: childVariants })}>{children}</motion.div>
      )
    : ({ children }: { children: ReactNode }) => <>{children}</>;
  
  // Processa os filhos para adicionar os wrappers quando necessário
  const processChildren = (children: ReactNode): ReactNode => {
    if (!staggerChildren) return children;
    
    return React.Children.map(children, (child) => (
      <ChildWrapper>{child}</ChildWrapper>
    ));
  };

  return (
    <motion.div
      {...motionProps({
        initial: "hidden",
        whileInView: "visible",
        variants: variants,
        viewport: { once },
        className: className,
        style: style
      })}
    >
      {processChildren(children)}
    </motion.div>
  );
};

export default FadeIn;