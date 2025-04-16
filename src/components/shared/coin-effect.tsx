'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/utils';
import { SparklesCore } from './sparkles';
import { Card } from '@/components/ui/card';
    // Importando a função utilitária para props de motion
    import { motionProps } from './motion-utils';

export function CoinEffectComponent({ children }: { children: React.ReactNode }) {
  return (
    <CoinContainer>
      {children}
    </CoinContainer>
  );
}

export const CoinContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'relative flex min-h-[700px] flex-col items-center justify-center overflow-hidden bg-transparent w-screen mr- rounded-md z-0',
        className
      )}
    >
      {/* Fundo Dinâmico com Gradientes e Efeitos */}
      <div className="absolute inset-0 z-0 bg-transparent"></div>

     {/* Baú */}
<motion.div
  {...motionProps({
    initial: { y: 50, opacity: 0 },
    whileInView: { y: 0, opacity: 1 },
    transition: { duration: 1, ease: 'easeInOut' },
    animate: {
      rotate: [0, 5, -5, 0], // Balanço
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatDelay: 3, // Balança a cada 3 segundos
        ease: 'easeInOut',
      },
    },
    className: "absolute bottom-[8%] z-10 w-[400px] h-[150px] bg-yellow-500 rounded-b-lg shadow-xl border-4 border-yellow-600 flex items-center justify-center overflow-hidden hover:scale-110 transition-transform duration-500"
  })}
>
  {/* Efeito de luz saindo do baú */}
  <div className="absolute -top-10 w-[500px] h-[150px] bg-gradient-to-t from-yellow-400/50 via-yellow-300/20 to-transparent blur-3xl opacity-50"></div>

  {/* Tampa do Baú com Animação */}
  <motion.div
    {...motionProps({
      initial: { y: 0 },
      animate: { y: [-10, 0] }, // Sobe e desce levemente
      transition: {
        duration: 0.5,
        yoyo: Infinity,
        ease: 'easeInOut',
      },
      className: "absolute top-[-40px] w-full h-[50px] bg-yellow-700 rounded-t-lg shadow-inner"
    })}
  ></motion.div>

  {/* Símbolo de $ com Brilho */}
  <div className="absolute w-[60px] h-[60px] flex items-center justify-center bg-yellow-600 rounded-full shadow-2xl hover:scale-110 transition-transform duration-500">
    <motion.span
      {...motionProps({
        initial: { scale: 1 },
        animate: { scale: 1.2 },
        transition: { duration: 1, yoyo: Infinity },
        className: "text-white text-3xl font-bold"
      })}
    >
      $
    </motion.span>
  </div>
</motion.div>

{/* Moedas Saindo do Baú */}
<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 mt-16">
  {[...Array(20)].map((_, i) => (
    <motion.div
      key={i}
      {...motionProps({
        initial: { y: 0, scale: 0.8 },
        animate: {
          y: [-20, -300], // Movimento para cima
          rotate: [0, 360], // Rotação
          scale: [0.8, 1, 0.8], // Leve variação no tamanho
        },
        transition: {
          duration: 3 + i * 0.2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
        className: "absolute w-10 h-10 bg-yellow-500 rounded-full shadow-md",
        style: {
          bottom: `${Math.random() * 50 + 20}%`, // Moedas espalhadas verticalmente
          left: `${Math.random() * 80 + 10}%`,  // Moedas espalhadas horizontalmente
        }
      })}
    >
      <div className="flex items-center justify-center h-full w-full text-yellow-900 font-bold text-lg">
        $
      </div>
    </motion.div>
  ))}
</div>

{/* Explosão de Moedas */}
<div className="absolute inset-0 z-10 pointer-events-none">
  {[...Array(50)].map((_, i) => (
    <motion.div
      key={i}
      {...motionProps({
        initial: { scale: 0, opacity: 0 },
        animate: {
          scale: [0.5, 1],
          opacity: [1, 0],
          x: `${Math.random() * 300 - 150}px`, // Explosão horizontal
          y: `${Math.random() * -300}px`,    // Explosão vertical
        },
        transition: {
          duration: 2,
          delay: i * 0.02, // Explosão gradual
          repeat: Infinity,
          repeatDelay: 6, // Explosão acontece a cada 6 segundos
        },
        className: "absolute w-6 h-6 bg-yellow-500 rounded-full shadow-lg"
      })}
    ></motion.div>
  ))}
</div>

{/* Moedas Saindo do Baú */}
<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 mt-16">
  {[...Array(12)].map((_, i) => (
    <motion.div
      key={i}
      {...motionProps({
        initial: { y: 0, rotate: 0 },
        animate: { y: [-10, -100], rotate: [0, 360] },
        transition: {
          duration: 3 + i * 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
        className: "absolute w-10 h-10 bg-yellow-500 rounded-full shadow-md",
        style: {
          bottom: `${Math.random() * 70 + 10}%`, // Moedas espalhadas verticalmente
          left: `${Math.random() * 90}%`,       // Moedas espalhadas horizontalmente
        }
      })}
    >
      <div className="flex items-center justify-center h-full w-full text-yellow-900 font-bold text-lg">
        $
      </div>
    </motion.div>
  ))}
</div>

      {/* Partículas de Moedas com Rotação */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <SparklesCore
          background="transparent"
          minSize={5}
          maxSize={10}
          particleDensity={60}
          speed={1}
          particleColor="#FFD700" // Moedas douradas
          className="absolute inset-0"
        />
      </div>

      {/* Conteúdo protegido */}
    
      <Card
  className="p-6 rounded-lg shadow-inner border border-gray-600 bg-gradient-to-r from-[#00073b9a] via-[#00073b] to-[#00073b68]/60 z-20 hover:bg-gradient-to-r hover:from-[#00073bf1] hover:via-[#000000] hover:to-[#00073bef] neon-glow opacity-80 hover:opacity-100 hover:scale-105
   hover:shadow-xl transition-all duration-500 ease-in-out"
>
        {children}
        </Card>
     
    </div>
  );
};