'use client';
import PublicLayout from './layout';
import { motion } from 'framer-motion';
import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { CheckCircle, Shield, Sun, Users, Zap, Building, Award } from "lucide-react";
import ContainerScroll from "@/components/shared/container-scroll-animation";
import Testimonials from '@/components/shared/testimonials';
import BackgroundEffects from '@/components/shared/BackgroundEffects';
import ImageCarousel from '@/components/shared/image-carousel';
import InfiniteMovingCards from '@/components/shared/infinity-moving-cards';
import { motionProps } from '@/components/shared/motion-utils';
import WaveSeparator from '@/components/shared/WaveSeparator';
import FadeIn from '@/components/shared/FadeIn';
import SimulateSection from '@/components/shared/SimulateSection';
import ContactSection from '@/components/shared/contact-section';
import React from 'react';

// Create a correctly typed motion div
const MotionDiv = motion.div;

// Carousel Images
const carouselImages = [
  {
    src: "/telhado_ind.png",
    alt: "Telhado Industrial",
    title: "Telhado Industrial",
    description: "Soluções para grandes áreas industriais",
  },
  {
    src: "/telhado.png",
    alt: "Painéis Residenciais",
    title: "Painéis Residenciais",
    description: "Economia para sua casa",
  },
  {
    src: "/Sun-energy-amico-1024x1024.png",
    alt: "Usina Solar",
    title: "Usina Solar",
    description: "Grandes instalações para geração distribuída",
  },
  {
    src: "/energia-solar-comercial-em-porto-alegre-1.png",
    alt: "Solução Comercial",
    title: "Solução Comercial",
    description: "Reduza custos em seu negócio",
  },
];

// Stats Section
const stats = [
  { id: 1, name: 'Clientes Atendidos', value: '750+', icon: Users, description: 'Pessoas e empresas em todo o Brasil' },
  { id: 2, name: 'MWh Economizados', value: '10.000+', icon: Zap, description: 'Energia limpa gerada anualmente' },
  { id: 3, name: 'Projetos Concluídos', value: '120+', icon: Building, description: 'Em residências e empresas' },
  { id: 4, name: 'Premiações', value: '15+', icon: Award, description: 'Reconhecimentos do setor' },
];

// StatsSection Component
const StatsSection = () => {
  return (
    <div style={{padding: '2rem 1rem'}}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <div className="text-center mb-16">
            <FadeIn>
              <h2 className="text-3xl font-bold tracking-tight text-gray-300 sm:text-4xl">
                Impacto que transforma vidas
              </h2>
              <p className="mt-4 text-lg leading-8 text-gray-400">
                Nossa missão é democratizar o acesso à energia limpa e econômica para todos
              </p>
            </FadeIn>
          </div>
          <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <Card key={stat.id} index={index} {...stat} />
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

// Card Component for Stats
interface CardProps {
  index: number;
  icon: React.ElementType;
  name: string;
  value: string;
  description: string;
}

const Card = ({ index, icon: Icon, name, value, description }: CardProps) => {
  return (
    <FadeIn delay={0.1 * index}>
      <div 
        className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 flex flex-col" 
        style={{ height: '260px', width: '100%' }}
      >
        <div className="absolute -right-10 -top-10 z-0">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-100 to-green-300 opacity-80 blur-2xl group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent z-0 group-hover:opacity-0 transition-opacity duration-500"></div>
          
        <div className="relative z-10 flex items-start">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 group-hover:bg-green-100 transition-colors duration-300">
            {React.createElement(Icon, {
              className: "h-6 w-6 text-green-600 group-hover:text-green-700 transition-colors duration-300",
              "aria-hidden": true
            })}
          </div>
        </div>
        
        <div className="mt-4 relative z-10 flex-grow">
          <dt className="font-semibold text-gray-900">{name}</dt>
          <dd className="mt-2">
            <span className="text-4xl font-bold tracking-tight text-gray-900 group-hover:text-green-600 transition-colors duration-300">{value}</span>
          </dd>
          <dd className="mt-2 text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">{description}</dd>
        </div>
        
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-green-300 to-green-500 transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500"></div>
      </div>
    </FadeIn>
  );
};

export default function HomePage() {
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.3 } },
  };

  const sectionVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.6 } },
  };

  // Generate deterministic decorative elements
  const decorativeElements = useMemo(() => {
    // Predefined values instead of random ones
    const elements = [
      { width: '15vw', height: '15vw', top: '20%', left: '85%', isEven: true },
      { width: '30vw', height: '20vw', top: '15%', left: '45%', isEven: false },
      { width: '25vw', height: '30vw', top: '25%', left: '55%', isEven: true },
      { width: '20vw', height: '25vw', top: '15%', left: '70%', isEven: false },
      { width: '25vw', height: '30vw', top: '30%', left: '25%', isEven: true },
    ];
    return elements;
  }, []);

  return (
    <PublicLayout>
    <motion.div
      initial="initial"
      animate="animate"
      variants={pageVariants}
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden'
      }}
    >
    
      <main style={{padding: '0'}}>
       RAAS
      </main>
    </motion.div>
    </PublicLayout>
  );
}