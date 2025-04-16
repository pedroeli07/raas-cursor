'use client'
import React, { useRef } from 'react'
import { useScroll, useTransform, motion, MotionValue } from 'framer-motion'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import BackgroundEffects from "./BackgroundEffects"

// Definindo um tipo explícito para evitar problemas com className
const MotionDiv = motion.div as React.FC<{
  className?: string;
  style?: any;
  children?: React.ReactNode;
  initial?: any;
  animate?: any;
  transition?: any;
}>;

interface ContainerScrollProps {
  titleComponent: string | React.ReactNode;
  imageUrl?: string;
  imageAlt?: string;
  backgroundColor?: string;
  customContent?: React.ReactNode;
  glowColor?: string;
  showHeroContent?: boolean;
}

interface HeaderProps {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
}

interface CardProps {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  backgroundColor: string;
  imageUrl: string;
  imageAlt: string;
  customContent?: React.ReactNode;
}

const ContainerScroll: React.FC<ContainerScrollProps> = ({
  titleComponent,
  imageUrl = "/telhado.png",
  imageAlt = "RaaS Platform",
  backgroundColor = "#040618",
  customContent,
  glowColor = "rgba(52, 211, 153, 0.2)",
  showHeroContent = false,
}) => {
  // Using non-null assertion to fix TypeScript error with useScroll
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef as React.RefObject<HTMLElement>,
  })
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const scaleDimensions = () => {
    return isMobile ? [0.7, 0.9] : [1.05, 1]
  }

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0])
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions())
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100])

  // Opacidade para as linhas no fundo
  const gridOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2])
  // Nova transformação para o efeito de brilho
  const glowOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.3, 0.1])
  
  // Transformações para efeitos solares
  const sunRotate = useTransform(scrollYProgress, [0, 1], [0, 45])
  const sunScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.2, 1])
  const raysOpacity = useTransform(scrollYProgress, [0, 0.3, 0.6, 1], [0, 0.4, 0.7, 0.2])

  return (
    <div
      className="w-full h-[60rem] flex relative gap-8 mx-auto items-center justify-center "
      ref={containerRef}
    >
      {/* BackgroundEffects component */}
      <BackgroundEffects 
        count={50}
        primaryColor="rgba(52, 211, 153, 0.4)"
        secondaryColor="rgba(59, 130, 246, 0.4)"
        sizeRange={[5, 20]}
        speedRange={[0.5, 1.5]}
      />

      {/* Fundo com Grades */}
      <MotionDiv
        className="absolute inset-0 z-0 pointer-events-none "
        style={{
          opacity: gridOpacity,
        }}
      >
        <div className="grid-lines"></div>
      </MotionDiv>

      {/* Efeito de brilho principal */}
      <MotionDiv
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          opacity: glowOpacity,
        }}
      >
        <div 
          className="absolute rounded-full blur-3xl" 
          style={{
            width: '40vw',
            height: '40vw', 
            top: '10%', 
            left: '30%',
            background: glowColor
          }}
        />
      </MotionDiv>

      {/* Efeito solar aprimorado */}
      <MotionDiv
        className="absolute top-[5%] right-[10%] z-10 pointer-events-none"
        style={{
          rotate: sunRotate,
          scale: sunScale,
        }}
      >
        <div className="relative">
          {/* Sol com gradiente e brilho mais intenso */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 absolute top-0 left-0 shadow-[0_0_40px_20px_rgba(255,204,0,0.4)] z-10"></div>
          
          {/* Brilho interno do sol */}
          <div className="w-16 h-16 rounded-full bg-white/60 absolute top-4 left-4 blur-md z-20"></div>
          
          {/* Raios solares animados */}
          <MotionDiv
            style={{
              opacity: raysOpacity,
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div 
                key={i} 
                style={{
                  position: "absolute",
                  height: '5px',
                  width: '80px',
                  left: '50%',
                  top: '50%',
                  transformOrigin: '0 50%',
                  transform: `rotate(${i * 30}deg) translateX(15px)`,
                  background: 'linear-gradient(90deg, rgba(253,216,53,0.8) 0%, rgba(253,216,53,0) 100%)',
                  boxShadow: '0 0 10px 1px rgba(253,216,53,0.3)',
                  borderRadius: '5px',
                }}
                animate={{
                  width: ['80px', '95px', '80px'],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2 + (i % 3),
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.1,
                }}
              />
            ))}
          </MotionDiv>
        </div>
      </MotionDiv>

      <div
        className="py-20 w-full relative bg-transparent/40 backdrop-blur-md  "
        style={{
          perspective: '1200px',
        }}
      >
          <h3 className="text-xl md:text-2xl md:mt-8 text-center font-medium text-white/90 mb-2">
                        Bem-vindo à revolução energética 
                      </h3>
        <Header
          translate={translate}
          titleComponent={titleComponent}
        />
        <Card
          rotate={rotate}
          translate={translate}
          scale={scale}
          backgroundColor={backgroundColor}
          imageUrl={imageUrl}
          imageAlt={imageAlt}
          customContent={showHeroContent ? (
            <div className="h-full w-full p-6 flex flex-col items-center justify-center text-white bg-transparent/60 backdrop-blur-lg">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                style={
                  { marginTop: '1rem', 
                    textAlign: 'center',
                    shadow: '0 0 10px 1px rgba(253,216,53,0.3)'
                  }
              }
              >
                <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight text-center">
                  <span className="text-[#34d399]">Roof</span> as a <span className="text-[#34d399]">Service</span>
                </h1>
                <motion.div 
                  style={{
                    height: '0.25rem', 
                    width: '5rem', 
                    background: 'linear-gradient(to right, #34d399, #3b82f6)', 
                    borderRadius: '9999px', 
                    marginTop: '1rem', 
                    marginLeft: 'auto', 
                    marginRight: 'auto'
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: 80 }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </motion.div>
              
              <div className="mx-0 max-w-full flex-shrink-0 pt-6 relative z-10">
                <div className="mt-4 text-center">
                  <div className="mt-8 sm:mt-12 lg:mt-8">
                    <a
                      href="/recursos"
                      className="inline-flex space-x-6"
                    >
                      <span className="rounded-full bg-[#34d399]/10 px-3 py-1 text-sm font-semibold leading-6 text-[#34d399] ring-1 ring-inset ring-[#34d399]/20">
                        Novidades
                      </span>
                      <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-200">
                        <span>Confira nossos novos recursos</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </a>
                  </div>
                  <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-5xl text-center">
                    Transforme seu telhado em fonte de economia
                  </h2>
                  <div className="mt-6 text-lg leading-8 text-gray-200 text-center max-w-3xl mx-auto">
                    Solução inovadora que transforma a maneira como você consome energia, 
                    com acesso simples a painéis solares, sem investimento inicial e com 
                    economia imediata na sua conta de luz.
                  </div>
                  <div className="mt-4 text-xl font-medium text-[#34d399] text-center">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.2, duration: 0.8 }}
                    >
                      Economia garantida e sustentabilidade ao seu alcance
                    </motion.span>
                  </div>
                  <div className="mt-8 flex items-center justify-center gap-x-6">
                    <Link href="/auth/register">
                      <Button className="bg-[#1b835d] hover:bg-[#28a87c] text-white shadow-lg shadow-[#34d399]/20" size="lg">
                        Comece agora
                      </Button>
                    </Link>
                    <Link href="/sobre" className="text-sm font-semibold leading-6 text-white hover:text-[#34d399] transition-colors duration-300">
                      Saiba mais <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : customContent}
        />
      </div>
    </div>
  )
}

export const Header = ({ translate, titleComponent }: HeaderProps) => {
  return (
    <MotionDiv
      className="h-full relative"
      style={{
        translateY: translate,
      }}
    >
      <div className="mx-auto px-4 2xl:px-0 flex flex-col justify-center h-full w-full">
        <div className="bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-600">
          {titleComponent}
        </div>
      </div>
    </MotionDiv>
  )
}

const Card = ({
  rotate,
  scale,
  translate,
  backgroundColor,
  imageUrl,
  imageAlt,
  customContent,
}: CardProps) => {
  return (
    <MotionDiv
      className="h-96 md:h-[34rem] w-full max-w-7xl bg-[#030712] rounded-[30px] overflow-hidden mx-auto relative"
      style={{
        rotateX: rotate, // rotate the div
        scale, // scale the div
        boxShadow: '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
      }}
    >
      {!customContent && (
        <div
          className="absolute inset-0 h-full w-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundColor: backgroundColor || "#030712",
          }}
        />
      )}
      {customContent && (
        <div className="h-full w-full">
          {customContent}
        </div>
      )}
    </MotionDiv>
  )
}

export default ContainerScroll;