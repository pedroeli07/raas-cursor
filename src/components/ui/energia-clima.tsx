"use client"

import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Box, Environment, OrbitControls, PerspectiveCamera, useTexture, Text, Cloud } from "@react-three/drei"
import { motion } from "framer-motion"
import { Suspense } from "react"
import * as THREE from "three"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Simulação de diferentes condições climáticas
type WeatherCondition = "sunny" | "cloudy" | "rainy" | "partlyCloudy"

interface WeatherProps {
  condition: WeatherCondition
}

// Cria as partículas de chuva
function Rain() {
  const rainCount = 500
  const rainRef = useRef<THREE.Points>(null!)
  
  // Geometria e posições aleatórias das gotas
  const [positions] = useState(() => {
    const positions = new Float32Array(rainCount * 3)
    
    for (let i = 0; i < rainCount; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 20
      positions[i3 + 1] = Math.random() * 10
      positions[i3 + 2] = (Math.random() - 0.5) * 20
    }
    
    return positions
  })
  
  useFrame(() => {
    if (rainRef.current) {
      const positions = rainRef.current.geometry.attributes.position.array as Float32Array
      
      for (let i = 0; i < rainCount; i++) {
        const i3 = i * 3
        positions[i3 + 1] -= 0.1 // velocidade da queda
        
        if (positions[i3 + 1] < -5) {
          positions[i3 + 1] = 10
        }
      }
      
      rainRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  return (
    <points ref={rainRef}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.1} 
        color="#aaddff" 
        transparent 
        opacity={0.6}
      />
    </points>
  )
}

// Clima com nuvens
function CloudyWeather() {
  return (
    <group>
      <Cloud position={[-4, 2, -5]} args={[3, 2]} />
      <Cloud position={[4, 4, -6]} args={[4, 2]} />
      <Cloud position={[0, 5, -3]} args={[5, 3]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 2]} intensity={0.7} castShadow />
    </group>
  )
}

// Clima parcialmente nublado
function PartlyCloudyWeather() {
  return (
    <group>
      <Cloud position={[-6, 4, -5]} args={[3, 2]} />
      <Cloud position={[6, 3, -6]} args={[2, 1.5]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 2]} intensity={1.2} castShadow />
    </group>
  )
}

// Clima ensolarado
function SunnyWeather() {
  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 2]} intensity={1.5} castShadow />
      <mesh position={[10, 10, -15]}>
        <sphereGeometry args={[5, 32, 32]} />
        <meshBasicMaterial color="#FFFF00" />
      </mesh>
    </group>
  )
}

// Clima chuvoso
function RainyWeather() {
  return (
    <group>
      <Cloud position={[-4, 2, -5]} args={[3, 2]} />
      <Cloud position={[4, 4, -6]} args={[4, 2]} />
      <Cloud position={[0, 5, -3]} args={[5, 3]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 2]} intensity={0.5} castShadow />
      <Rain />
    </group>
  )
}

// Componente do painel solar
function SolarPanel() {
  const group = useRef<THREE.Group>(null!)
  
  // Animação suave
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.05
    }
  })
  
  // Materiais
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: '#555555',
    metalness: 0.5,
    roughness: 0.7
  })
  
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: '#1e3a8a',
    metalness: 0.8,
    roughness: 0.2,
    envMapIntensity: 1.5
  })
  
  return (
    <group ref={group} position={[0, -1, 0]} rotation={[0, 0, 0]}>
      {/* Base structure */}
      <Box args={[5, 0.2, 5]} position={[0, -0.1, 0]} castShadow receiveShadow>
        <primitive object={frameMaterial} attach="material" />
      </Box>
      
      {/* Main frame */}
      <group position={[0, 0.5, 0]} rotation={[Math.PI * 0.15, 0, 0]}>
        {/* Solar panel frame */}
        <Box args={[4, 0.1, 3]} position={[0, 0, 0]} castShadow receiveShadow>
          <primitive object={frameMaterial} attach="material" />
        </Box>
        
        {/* Solar panels */}
        <Box args={[3.8, 0.05, 2.8]} position={[0, 0.08, 0]} castShadow receiveShadow>
          <primitive object={panelMaterial} attach="material" />
        </Box>
        
        {/* Panel grid lines */}
        {[...Array(6)].map((_, i) => (
          <Box 
            key={`horizontal-${i}`} 
            args={[3.8, 0.06, 0.02]} 
            position={[0, 0.09, -1.4 + i * 0.56]}
            castShadow
            receiveShadow
          >
            <primitive object={frameMaterial} attach="material" />
          </Box>
        ))}
        
        {[...Array(8)].map((_, i) => (
          <Box 
            key={`vertical-${i}`} 
            args={[0.02, 0.06, 2.8]} 
            position={[-1.9 + i * 0.54, 0.09, 0]}
            castShadow
            receiveShadow
          >
            <primitive object={frameMaterial} attach="material" />
          </Box>
        ))}
      </group>
      
      {/* Support pillar */}
      <Box args={[0.4, 1, 0.4]} position={[0, 0.4, 0]} castShadow receiveShadow>
        <primitive object={frameMaterial} attach="material" />
      </Box>
    </group>
  )
}

// Solo e terreno
function Ground() {
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -1.1, 0]} 
      receiveShadow
    >
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial 
        color="#115511"
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}

// Indicador de produção de energia
function EnergyProduction({ condition }: { condition: WeatherCondition }) {
  const productionRates = {
    sunny: 1.0, // 100% da capacidade
    partlyCloudy: 0.7, // 70% da capacidade
    cloudy: 0.4, // 40% da capacidade
    rainy: 0.2 // 20% da capacidade
  }
  
  const rate = productionRates[condition]
  
  return (
    <group position={[0, 3, 0]}>
      <Text
        position={[0, 0, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {`${Math.round(rate * 100)}% de produção`}
      </Text>
    </group>
  )
}

// Componente principal que renderiza a cena 3D
function Weather3DScene({ condition }: WeatherProps) {
  return (
    <Canvas 
      shadows 
      camera={{ position: [8, 5, 8], fov: 50 }}
      gl={{ 
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping
      }}
    >
      <color attach="background" args={['#87CEEB']} />
      <fog attach="fog" args={['#87CEEB', 10, 30]} />
      
      <Suspense fallback={null}>
        <SolarPanel />
        <Ground />
        <EnergyProduction condition={condition} />
        
        {condition === "sunny" && <SunnyWeather />}
        {condition === "cloudy" && <CloudyWeather />}
        {condition === "partlyCloudy" && <PartlyCloudyWeather />}
        {condition === "rainy" && <RainyWeather />}
        
        <Environment preset="sunset" />
      </Suspense>
      
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        autoRotate={true}
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  )
}

export function EnergiaClima() {
  const [isClient, setIsClient] = useState(false)
  const [condition, setCondition] = useState<WeatherCondition>("sunny")
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  const dataProducao = {
    sunny: { 
      valor: 42, 
      descricao: "Máxima produção com céu limpo", 
      porcentagem: "100%" 
    },
    partlyCloudy: { 
      valor: 30, 
      descricao: "Produção parcial com algumas nuvens", 
      porcentagem: "70%" 
    },
    cloudy: { 
      valor: 17, 
      descricao: "Produção reduzida com muitas nuvens", 
      porcentagem: "40%" 
    },
    rainy: { 
      valor: 8, 
      descricao: "Produção mínima durante chuva", 
      porcentagem: "20%" 
    }
  }
  
  const condicaoAtual = dataProducao[condition]
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">Simulação de Produção de Energia</CardTitle>
            <CardDescription>
              Veja como as condições climáticas afetam a geração de energia
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="h-[400px]">
            {isClient && <Weather3DScene condition={condition} />}
          </div>
          
          <div className="p-6 flex flex-col">
            <div className="flex flex-wrap gap-2 mb-6">
              <Button 
                onClick={() => setCondition("sunny")}
                variant={condition === "sunny" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <SunIcon />
                <span>Ensolarado</span>
              </Button>
              
              <Button 
                onClick={() => setCondition("partlyCloudy")}
                variant={condition === "partlyCloudy" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <CloudSunIcon />
                <span>Parcialmente Nublado</span>
              </Button>
              
              <Button 
                onClick={() => setCondition("cloudy")}
                variant={condition === "cloudy" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <CloudIcon />
                <span>Nublado</span>
              </Button>
              
              <Button 
                onClick={() => setCondition("rainy")}
                variant={condition === "rainy" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <CloudRainIcon />
                <span>Chuvoso</span>
              </Button>
            </div>
            
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">
                {condicaoAtual.valor} kWh
              </h3>
              <p className="text-muted-foreground mb-4">
                {condicaoAtual.descricao}
              </p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Eficiência do Painel</span>
                    <span>{condicaoAtual.porcentagem}</span>
                  </div>
                  <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary rounded-full" 
                      initial={{ width: 0 }}
                      animate={{ width: condicaoAtual.porcentagem }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Fatores que afetam a produção:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    <li>Intensidade da luz solar</li>
                    <li>Cobertura de nuvens</li>
                    <li>Ângulo do painel</li>
                    <li>Temperatura ambiente</li>
                    <li>Precipitação</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Ícones para os botões
function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2" />
      <path d="M12 21v2" />
      <path d="M4.2 4.2l1.4 1.4" />
      <path d="M18.4 18.4l1.4 1.4" />
      <path d="M1 12h2" />
      <path d="M21 12h2" />
      <path d="M4.2 19.8l1.4-1.4" />
      <path d="M18.4 5.6l1.4-1.4" />
    </svg>
  )
}

function CloudIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  )
}

function CloudSunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="M20 12h2" />
      <path d="m19.07 4.93-1.41 1.41" />
      <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
      <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" />
    </svg>
  )
}

function CloudRainIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9" />
      <path d="M16 14v6" />
      <path d="M8 14v6" />
      <path d="M12 16v6" />
    </svg>
  )
}

import { Button } from "@/components/ui/button" 