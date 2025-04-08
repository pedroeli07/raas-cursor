'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAppSettingsStore } from '@/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Define as categorias disponíveis
const CATEGORIES = [
  { id: 'system', label: 'Sistema' },
  { id: 'billing', label: 'Faturamento' },
  { id: 'credits', label: 'Créditos' },
  { id: 'notifications', label: 'Notificações' },
];

export default function SettingsManager() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const { 
    settings, 
    isLoading, 
    error, 
    fetchSettings, 
    updateSetting, 
    clearError 
  } = useAppSettingsStore();
  
  // Estado para controlar valores editados
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  
  // Carregar configurações ao montar o componente
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);
  
  // Limpar erro quando mudar
  useEffect(() => {
    if (error) {
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive',
      });
      clearError();
    }
  }, [error, toast, clearError]);
  
  // Agrupar configurações por categoria
  const settingsByCategory = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, typeof settings>);
  
  // Manipular mudança de valor
  const handleValueChange = (key: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  
  // Salvar configuração
  const handleSave = async (key: string) => {
    if (!editedValues[key]) return;
    
    setSavingKey(key);
    await updateSetting(key, editedValues[key]);
    setSavingKey(null);
    
    // Limpar valor editado após salvar com sucesso
    setEditedValues(prev => {
      const newValues = { ...prev };
      delete newValues[key];
      return newValues;
    });
    
    toast({
      title: 'Configuração atualizada',
      description: `A configuração "${key}" foi atualizada com sucesso.`,
    });
  };
  
  // Verificar permissões do usuário
  const userRole = session?.user?.role;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  
  // Renderizar badge de permissão
  const renderPermissionBadge = (key: string) => {
    // Simplificar implementação - na prática deve usar a mesma lógica do backend
    if (['PRIMARY_ADMIN_EMAIL', 'PLATFORM_NAME', 'PLATFORM_FEE_PERCENTAGE'].includes(key)) {
      return <Badge variant="destructive" className="ml-2">Super Admin</Badge>;
    }
    
    if (['DEFAULT_DISCOUNT_RATE', 'BILLING_DATE', 'CREDIT_EXPIRATION_MONTHS'].includes(key)) {
      return <Badge variant="secondary" className="ml-2">Admin</Badge>;
    }
    
    return null;
  };
  
  if (isLoading && settings.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }
  
  return (
    <Tabs defaultValue="system" className="w-full">
      <TabsList className="grid grid-cols-4 mb-6">
        {CATEGORIES.map(category => (
          <TabsTrigger key={category.id} value={category.id}>
            {category.label}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {CATEGORIES.map(category => (
        <TabsContent key={category.id} value={category.id} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {settingsByCategory[category.id]?.map(setting => (
              <Card key={setting.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {setting.key} 
                      {renderPermissionBadge(setting.key)}
                    </CardTitle>
                  </div>
                  <CardDescription>{setting.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {setting.type === 'boolean' ? (
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`toggle-${setting.id}`}>Ativar</Label>
                        <Switch 
                          id={`toggle-${setting.id}`}
                          checked={editedValues[setting.key] !== undefined 
                            ? editedValues[setting.key] === 'true' 
                            : setting.value === 'true'}
                          onCheckedChange={(checked) => 
                            handleValueChange(setting.key, checked ? 'true' : 'false')
                          }
                          disabled={
                            (setting.key === 'PRIMARY_ADMIN_EMAIL' && !isSuperAdmin) ||
                            (setting.key.startsWith('DEFAULT_') && !isAdmin)
                          }
                        />
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <Label htmlFor={`input-${setting.id}`}>Valor</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id={`input-${setting.id}`}
                            value={editedValues[setting.key] !== undefined 
                              ? editedValues[setting.key] 
                              : setting.value}
                            onChange={(e) => handleValueChange(setting.key, e.target.value)}
                            disabled={
                              (setting.key === 'PRIMARY_ADMIN_EMAIL' && !isSuperAdmin) ||
                              (setting.key.startsWith('DEFAULT_') && !isAdmin)
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button 
                    className="ml-auto"
                    onClick={() => handleSave(setting.key)} 
                    disabled={
                      !editedValues[setting.key] || 
                      savingKey === setting.key || 
                      (setting.key === 'PRIMARY_ADMIN_EMAIL' && !isSuperAdmin) ||
                      (setting.key.startsWith('DEFAULT_') && !isAdmin)
                    }
                  >
                    {savingKey === setting.key ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        <span>Salvar</span>
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
} 