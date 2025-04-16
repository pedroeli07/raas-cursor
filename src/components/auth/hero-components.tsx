'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { LucideChevronRight, LucideCheckCircle } from 'lucide-react';

// --- Hero Column Components (Right side on desktop) ---
// Container for the hero section
export function HeroColumn() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative hidden overflow-hidden md:flex md:w-1/2" // Hidden on mobile
    >
      {/* Overlay with gradient and blur */}
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-blue-600/20 to-indigo-600/30 backdrop-blur-sm dark:from-blue-600/40 dark:to-indigo-600/50"></div>

      <BackgroundEffects />
      <HeroContent />
    </motion.div>
  );
}

// Component for animated background elements
function BackgroundEffects() {
  return (
    <div className="absolute inset-0 z-0">
      {/* Base background color */}
      <div className="absolute inset-0 bg-blue-400/80 dark:bg-emerald-600/70"></div>
      {/* Pattern overlay */}
      <div className="absolute inset-0 h-full w-full bg-[url('/images/solar-pattern.svg')] bg-repeat opacity-20 animate-pulse dark:opacity-20"></div>

      {/* Static blurred shapes */}
      <div className="absolute right-10 top-10 h-24 w-24 animate-pulse rounded-full bg-yellow-400 opacity-30 blur-2xl dark:opacity-40"></div>
      <div className="absolute bottom-20 left-20 h-32 w-32 animate-pulse rounded-full bg-blue-500 opacity-20 blur-3xl dark:opacity-30"></div>

      {/* Animated blurred shapes using framer-motion */}
      <motion.div
        className="absolute -right-4 -top-4 h-40 w-40 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 blur-2xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      <motion.div
        className="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          delay: 1,
        }}
      />
    </div>
  );
}

// Component for the main text content in the hero section
function HeroContent() {
  return (
    <div className="relative z-20 flex w-full flex-col justify-center p-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="max-w-lg" // Limit width of text content
      >
        <h2 className="mb-6 font-heading text-3xl font-bold text-white drop-shadow-lg">
          Energia Solar Acessível para Todos
        </h2>
        <p className="mb-8 text-lg text-white/80 drop-shadow">
          Conectamos consumidores que querem economizar a usinas solares com
          capacidade disponível. Economize até 20% na sua conta de luz sem
          instalar painéis solares.
        </p>

        <BenefitsCard />
      </motion.div>
    </div>
  );
}

// Component for the card displaying benefits
function BenefitsCard() {
  return (
    <motion.div
      className="rounded-lg border border-white/20 bg-gradient-to-br from-emerald-900/80 via-emerald-900/70 to-emerald-900/0 p-6 shadow-xl backdrop-blur-md"
      whileHover={{ scale: 1.02 }} // Subtle scale effect on hover
      transition={{ type: "spring", stiffness: 400, damping: 17 }} // Spring animation
    >
      <div className="space-y-4 text-white">
        <BenefitItem text="Economia garantida na conta de luz" />
        <BenefitItem text="Sem instalação, sem obras, sem complicação" />
        <BenefitItem text="Contribua para um futuro mais sustentável" /> {/* Updated text */}
      </div>
    </motion.div>
  );
}

// Component for a single benefit item with an icon
function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-start">
      {/* Checkmark icon container */}
      <div className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-500/30">
        <svg
          className="h-4 w-4 text-green-300" // Adjusted size and color
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3} // Make checkmark thicker
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <p className="text-sm">{text}</p> {/* Slightly smaller text */}
    </div>
  );
}