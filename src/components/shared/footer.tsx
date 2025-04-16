'use client';

import { Facebook, Instagram, Linkedin, Twitter, Mail, MapPin, Phone } from "lucide-react";
import { motion } from "framer-motion";
import WaveSeparator from "./WaveSeparator";
import { motionProps } from './motion-utils';
import Link from 'next/link';
import { useMemo } from 'react';

const navigation = {
  principal: [
    { name: 'Início', href: '/' },
    { name: 'Serviços', href: '/servicos' },
    { name: 'Recursos', href: '/recursos' },
    { name: 'Sobre', href: '/sobre' },
  ],
  suporte: [
    { name: 'FAQ', href: '/faq' },
    { name: 'Contato', href: '/contato' },
    { name: 'Política de Privacidade', href: '#' },
    { name: 'Termos de Uso', href: '#' },
  ],
  solucoes: [
    { name: 'Residencial', href: '/servicos#residencial' },
    { name: 'Empresarial', href: '/servicos#empresarial' },
    { name: 'Consultoria Energética', href: '/servicos#consultoria' },
    { name: 'RaaS Enterprise', href: '/servicos#enterprise' },
  ],
  social: [
    {
      name: 'Facebook',
      href: '#',
      icon: (props: React.SVGProps<SVGSVGElement>) => <Facebook {...props} />,
    },
    {
      name: 'Instagram',
      href: '#',
      icon: (props: React.SVGProps<SVGSVGElement>) => <Instagram {...props} />,
    },
    {
      name: 'Twitter',
      href: '#',
      icon: (props: React.SVGProps<SVGSVGElement>) => <Twitter {...props} />,
    },
    {
      name: 'LinkedIn',
      href: '#',
      icon: (props: React.SVGProps<SVGSVGElement>) => <Linkedin {...props} />,
    },
  ],
};

export default function Footer() {
  // Generate deterministic decorative elements
  const decorativeElements = useMemo(() => {
    return [
      { width: '10vw', height: '10vw', top: '70%', left: '70%' },
      { width: '9vw', height: '8vw', top: '58%', left: '13%' },
      { width: '11vw', height: '9vw', top: '61%', left: '70%' },
      { width: '14vw', height: '8vw', top: '67%', left: '58%' },
      { width: '11vw', height: '8vw', top: '42%', left: '62%' },
    ];
  }, []);

  return (
    <>
      {/* Separador de onda entre o conteúdo e o footer */}
      <div className="relative">
        <WaveSeparator color="#0f172a" flip={false} />
      </div>
      
      <footer className="bg-gradient-to-b from-[#0f172a] to-[#1a2942]" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        
        {/* Elementos solares decorativos */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {decorativeElements.map((element, i) => (
            <motion.div
              key={i}
              {...motionProps({
                className: "absolute rounded-full bg-[#34d399] opacity-10",
                style: {
                  width: element.width,
                  height: element.height,
                  top: element.top,
                  left: element.left,
                },
                animate: {
                  y: [0, i % 2 === 0 ? 10 : -10],
                  x: [0, i % 2 === 0 ? -10 : 10],
                },
                transition: {
                  duration: 5 + i,
                  repeat: Infinity,
                  repeatType: "reverse",
                }
              })}
            />
          ))}
        </div>
        
        <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 relative z-10">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <motion.div 
              {...motionProps({
                className: "space-y-8",
                initial: { opacity: 0, y: 20 },
                whileInView: { opacity: 1, y: 0 },
                transition: { duration: 0.5 }
              })}
            >
              <img
                src="/LOGO_RAAS.png"
                alt="RaaS Logo"
                width={120}
                height={48}
                className="h-12 w-auto"
              />
              <p className="text-sm leading-6 text-gray-300">
                Transformando o mercado de energia solar com soluções acessíveis e sustentáveis para todos.
              </p>
              <div className="flex space-x-6">
                {navigation.social.map((item, index) => (
                  <motion.a 
                    key={item.name} 
                    {...motionProps({
                      href: item.href,
                      className: "text-gray-400 hover:text-[#34d399] transition-colors duration-300",
                      whileHover: { scale: 1.2, rotate: 5 },
                      initial: { opacity: 0, y: 20 },
                      whileInView: { opacity: 1, y: 0 },
                      transition: { duration: 0.3, delay: index * 0.1 }
                    })}
                  >
                    <span className="sr-only">{item.name}</span>
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                  </motion.a>
                ))}
              </div>
            </motion.div>
            
            <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <motion.div
                  {...motionProps({
                    initial: { opacity: 0, y: 20 },
                    whileInView: { opacity: 1, y: 0 },
                    transition: { duration: 0.5, delay: 0.1 }
                  })}
                >
                  <h3 className="text-sm font-semibold leading-6 text-[#34d399]">Navegação</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {navigation.principal.map((item, index) => (
                      <motion.li 
                        key={item.name}
                        {...motionProps({
                          initial: { opacity: 0, x: -20 },
                          whileInView: { opacity: 1, x: 0 },
                          transition: { duration: 0.3, delay: index * 0.1 }
                        })}
                      >
                        <Link href={item.href} className="text-sm leading-6 text-gray-300 hover:text-[#34d399] transition-colors duration-200">
                          {item.name}
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
                
                <motion.div 
                  {...motionProps({
                    className: "mt-10 md:mt-0",
                    initial: { opacity: 0, y: 20 },
                    whileInView: { opacity: 1, y: 0 },
                    transition: { duration: 0.5, delay: 0.2 }
                  })}
                >
                  <h3 className="text-sm font-semibold leading-6 text-[#34d399]">Suporte</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {navigation.suporte.map((item, index) => (
                      <motion.li 
                        key={item.name}
                        {...motionProps({
                          initial: { opacity: 0, x: -20 },
                          whileInView: { opacity: 1, x: 0 },
                          transition: { duration: 0.3, delay: index * 0.1 }
                        })}
                      >
                        <Link href={item.href} className="text-sm leading-6 text-gray-300 hover:text-[#34d399] transition-colors duration-200">
                          {item.name}
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </div>
              
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <motion.div
                  {...motionProps({
                    initial: { opacity: 0, y: 20 },
                    whileInView: { opacity: 1, y: 0 },
                    transition: { duration: 0.5, delay: 0.3 }
                  })}
                >
                  <h3 className="text-sm font-semibold leading-6 text-[#34d399]">Soluções</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {navigation.solucoes.map((item, index) => (
                      <motion.li 
                        key={item.name}
                        {...motionProps({
                          initial: { opacity: 0, x: -20 },
                          whileInView: { opacity: 1, x: 0 },
                          transition: { duration: 0.3, delay: index * 0.1 }
                        })}
                      >
                        <Link href={item.href} className="text-sm leading-6 text-gray-300 hover:text-[#34d399] transition-colors duration-200">
                          {item.name}
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
                
                <motion.div 
                  {...motionProps({
                    className: "mt-10 md:mt-0",
                    initial: { opacity: 0, y: 20 },
                    whileInView: { opacity: 1, y: 0 },
                    transition: { duration: 0.5, delay: 0.4 }
                  })}
                >
                  <h3 className="text-sm font-semibold leading-6 text-[#34d399]">Contato</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    <motion.li
                      {...motionProps({
                        initial: { opacity: 0, x: -20 },
                        whileInView: { opacity: 1, x: 0 },
                        transition: { duration: 0.3, delay: 0.1 },
                        className: "flex items-center"
                      })}
                    >
                      <Mail className="h-4 w-4 mr-2 text-[#34d399]" />
                      <p className="text-sm leading-6 text-gray-300">
                        contato@raas.com.br
                      </p>
                    </motion.li>
                    <motion.li
                      {...motionProps({
                        initial: { opacity: 0, x: -20 },
                        whileInView: { opacity: 1, x: 0 },
                        transition: { duration: 0.3, delay: 0.2 },
                        className: "flex items-center"
                      })}
                    >
                      <Phone className="h-4 w-4 mr-2 text-[#34d399]" />
                      <p className="text-sm leading-6 text-gray-300">
                        +55 (37) 3333-4444
                      </p>
                    </motion.li>
                    <motion.li
                      {...motionProps({
                        initial: { opacity: 0, x: -20 },
                        whileInView: { opacity: 1, x: 0 },
                        transition: { duration: 0.3, delay: 0.3 },
                        className: "flex items-center"
                      })}
                    >
                      <MapPin className="h-4 w-4 mr-2 text-[#34d399]" />
                      <p className="text-sm leading-6 text-gray-300">
                        Av. Ipiranga, 6681 - Lagoa da Prata/MG
                      </p>
                    </motion.li>
                  </ul>
                </motion.div>
              </div>
            </div>
          </div>
          
          <motion.div 
            {...motionProps({
              className: "mt-16 border-t border-[#34d399]/30 pt-8 sm:mt-20 lg:mt-24",
              initial: { opacity: 0 },
              whileInView: { opacity: 1 },
              transition: { duration: 0.6, delay: 0.5 }
            })}
          >
            <p className="text-xs leading-5 text-gray-400 text-center">
              &copy; {new Date().getFullYear()} RaaS - Energia Solar por Assinatura. Todos os direitos reservados.
            </p>
          </motion.div>
        </div>
      </footer>
    </>
  );
}