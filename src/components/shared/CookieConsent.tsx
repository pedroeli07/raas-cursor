'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link'
import { X, Check, Cog, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useCookieConsent } from '@/hooks/use-cookie-consent';
import { CookieSettings } from '@/lib/utils/cookies';

export default function CookieConsent() {   
  const [showSettings, setShowSettings] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { 
    hasConsent, 
    settings, 
    acceptAll, 
    acceptOnlyNecessary, 
    updateSettings 
  } = useCookieConsent();

  // Verificar se o componente foi montado no cliente (evita erros de hidratação)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Efeito de entrada suave
  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  // Alternar configurações de cookies
  const toggleSetting = (setting: keyof CookieSettings) => {
    if (setting === 'necessary') return; // Não permitir alterar cookies necessários
    updateSettings({
      [setting]: !settings[setting]
    });
  };

  // Salvar configurações de cookies
  const saveSettings = () => {
    updateSettings(settings);
    setShowSettings(false);
  };

  // Se o componente não foi montado ainda ou se já tiver consentimento, não exibe o banner
  if (!mounted || hasConsent) return null;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 transition-all duration-500 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
    >
      <div className="mx-auto max-w-6xl">
        <div className="relative rounded-lg border border-gray-700 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 shadow-lg">
          {/* Elemento decorativo */}
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true"></div>
          
          {showSettings ? (
            <>
              <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-white" id="cookie-settings-title">Configurações de Privacidade</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(false)}
                  className="h-8 w-8 rounded-full border border-gray-700 bg-gray-800 text-gray-400 hover:text-white"
                  aria-label="Fechar configurações"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              
              <div className="mb-6 text-sm text-gray-400">
                <p>Escolha quais cookies você deseja aceitar. Os cookies necessários são usados para a funcionalidade básica do site e não podem ser recusados.</p>
              </div>
              
              <div className="mb-6 space-y-4" role="group" aria-labelledby="cookie-settings-title">
                <div className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-800/50 p-3">
                  <div>
                    <p className="font-medium text-white" id="necessary-cookies-label">Cookies Necessários</p>
                    <p className="text-xs text-gray-400" id="necessary-cookies-description">Essenciais para o funcionamento do site</p>
                  </div>
                  <Switch 
                    checked={settings.necessary} 
                    disabled 
                    className="data-[state=checked]:bg-emerald-500" 
                    aria-labelledby="necessary-cookies-label"
                    aria-describedby="necessary-cookies-description"
                  />
                </div>
                
                <div className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-800/50 p-3">
                  <div>
                    <p className="font-medium text-white" id="analytics-cookies-label">Cookies Analíticos</p>
                    <p className="text-xs text-gray-400" id="analytics-cookies-description">Nos ajudam a entender como você usa o site</p>
                  </div>
                  <Switch 
                    checked={settings.analytics} 
                    onCheckedChange={() => toggleSetting('analytics')}
                    className="data-[state=checked]:bg-emerald-500"
                    aria-labelledby="analytics-cookies-label"
                    aria-describedby="analytics-cookies-description"
                  />
                </div>
                
                <div className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-800/50 p-3">
                  <div>
                    <p className="font-medium text-white" id="marketing-cookies-label">Cookies de Marketing</p>
                    <p className="text-xs text-gray-400" id="marketing-cookies-description">Permitem anúncios personalizados</p>
                  </div>
                  <Switch 
                    checked={settings.marketing} 
                    onCheckedChange={() => toggleSetting('marketing')}
                    className="data-[state=checked]:bg-emerald-500"
                    aria-labelledby="marketing-cookies-label"
                    aria-describedby="marketing-cookies-description"
                  />
                </div>
                
                <div className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-800/50 p-3">
                  <div>
                    <p className="font-medium text-white" id="preferences-cookies-label">Cookies de Preferências</p>
                    <p className="text-xs text-gray-400" id="preferences-cookies-description">Armazenam preferências no uso do site</p>
                  </div>
                  <Switch 
                    checked={settings.preferences} 
                    onCheckedChange={() => toggleSetting('preferences')}
                    className="data-[state=checked]:bg-emerald-500"
                    aria-labelledby="preferences-cookies-label"
                    aria-describedby="preferences-cookies-description"
                  />
                </div>
              </div>
              
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  className="border-gray-700 text-white hover:bg-gray-700 hover:text-white"
                  onClick={() => setShowSettings(false)}
                  aria-label="Voltar para o banner principal"
                >
                  Voltar
                </Button>
                <Button
                  variant="default"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={saveSettings}
                  aria-label="Salvar minhas preferências de cookies"
                >
                  Salvar Preferências
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-white" id="cookie-consent-title">Sua Privacidade</h3>
                </div>
              </div>
              
              <div className="mb-6 text-sm text-gray-300">
                <p>
                  Utilizamos cookies para melhorar sua experiência, personalizar conteúdo e analisar 
                  a utilização do site. Utilizamos cookies próprios e de terceiros para 
                  armazenar e acessar informações em seu dispositivo. Em atendimento à Lei Geral 
                  de Proteção de Dados, pedimos seu consentimento para processar seus dados pessoais.
                </p>
                <p className="mt-2">
                  <Link 
                    href="/politica-de-privacidade" 
                    className="text-emerald-400 hover:text-emerald-300 hover:underline"
                    aria-label="Ler nossa política de privacidade em uma nova página"
                  >
                    Leia nossa Política de Privacidade
                  </Link>
                </p>
              </div>
              
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end" role="group" aria-labelledby="cookie-options">
                <span id="cookie-options" className="sr-only">Opções de consentimento de cookies</span>
                <Button
                  variant="outline"
                  className="border-gray-700 text-white hover:bg-gray-700 hover:text-white order-3 sm:order-1"
                  onClick={acceptOnlyNecessary}
                  aria-label="Aceitar apenas cookies essenciais"
                >
                  Apenas Essenciais
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-700 text-white hover:bg-gray-700 hover:text-white order-2"
                  onClick={() => setShowSettings(true)}
                  aria-label="Personalizar minhas preferências de cookies"
                >
                  <Cog className="mr-2 h-4 w-4" aria-hidden="true" />
                  Personalizar
                </Button>
                <Button
                  variant="default"
                  className="bg-emerald-600 text-white hover:bg-emerald-700 order-1 sm:order-3"
                  onClick={acceptAll}
                  aria-label="Aceitar todos os tipos de cookies"
                >
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                  Aceitar Todos
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 