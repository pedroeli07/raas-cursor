'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaWhatsapp, FaEnvelope, FaPhone } from 'react-icons/fa';
import { CoinEffectComponent } from './coin-effect';
import { motionProps } from './motion-utils';

const ContactSection: React.FC = () => {
    const contactOptions = [
        {
            href: 'https://wa.me/5511987654321',
            text: 'WhatsApp',
            icon: <FaWhatsapp size={24} />,
            gradient: 'bg-[conic-gradient(from_90deg_at_50%_50%,#A3E635_0%,#16A34A_50%,#A3E635_100%)]',
            bgColor: 'bg-green-800 hover:bg-green-900',
            hoverScale: 1.1,
          },
        {
            href: 'mailto:contato@roofasaservice.com.br',
            text: 'Email',
            icon: <FaEnvelope size={24} />,
            gradient: 'bg-[conic-gradient(from_90deg_at_50%_50%,#D4F1F4_0%,#33A1FD_50%,#D4F1F4_100%)]',
            bgColor: 'bg-blue-800 hover:bg-blue-900',
            hoverScale: 1.1,
          },
        {
            href: 'tel:+551130302020',
            text: 'Telefone',
            icon: <FaPhone size={24} />,
            gradient: 'bg-[conic-gradient(from_90deg_at_50%_50%,#C0C0C0_0%,#696969_50%,#C0C0C0_100%)]',
            bgColor: 'bg-gray-800 hover:bg-gray-900',
            hoverScale: 1.1,
          },
      ];


  return (
    <section className="relative w-full bg-blue-900 text-white noen-border overflow-hidden bg-gradient-to-r from-[#00073b9a] via-[#00073b] to-[#00073b68]/60 z-20 hover:bg-gradient-to-r hover:from-[#00073bf1] hover:via-[#000000] hover:to-[#00073bef] neon-glow">
      {/* Efeito de Moedas com Partículas */}
      <CoinEffectComponent>
        <motion.h2
          {...motionProps({
            initial: { opacity: 0, y: 20 },
            whileInView: { opacity: 1, y: 0 },
            transition: { duration: 1 },
            className: "text-4xl font-bold mt-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-200 text-center"
          })}
        >
          Entre em Contato
        </motion.h2>
        <motion.p
          {...motionProps({
            initial: { opacity: 0, y: 40 },
            whileInView: { opacity: 1, y: 0 },
            transition: { duration: 1, delay: 0.3 },
            className: "text-lg text-gray-300 mt-10 bg-transparent"
          })}
        >
          Estamos prontos para ajudar você a economizar com energia solar sem investimento inicial.
          Escolha uma das opções abaixo:
        </motion.p>
        {/* Opções de Contato */}
        
        <div className="flex flex-col md:flex-row justify-center gap-6 mt-6">
        {contactOptions.map((option, index) => (
          <motion.a
            key={index}
            {...motionProps({
              href: option.href,
              target: "_blank",
              rel: "noopener noreferrer",
              className: `relative inline-flex h-14 w-40 overflow-hidden rounded-full p-[2px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50`,
              whileHover: { scale: option.hoverScale }
            })}
          >
            <span
              className={`absolute inset-[-1000%] animate-spin ${option.gradient}`}
            ></span>
            <span
              className={`inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full ${option.bgColor} px-4 py-2 text-lg font-medium text-white backdrop-blur-3xl transition-transform transform hover:scale-105`}
            >
              {option.icon}
              <span className="ml-3">{option.text}</span>
            </span>
          </motion.a>
        ))}
      </div>
      </CoinEffectComponent>
    </section>
  );
};

export default ContactSection;