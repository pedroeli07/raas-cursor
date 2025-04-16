'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TerminalSquare, XCircle, Filter, ChevronDown, Download, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDebug, LogLevel, LogMessage } from '@/lib/context/DebugContext';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';

const LOG_LEVEL_COLORS = {
  info: 'text-blue-500',
  warn: 'text-yellow-500',
  error: 'text-red-500',
  debug: 'text-gray-400',
};

export function DebugPanel() {
  const { logs, clearLogs, isDebugEnabled, toggleDebug, addLog } = useDebug();
  const [isOpen, setIsOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [stats, setStats] = useState({ 
    info: 0, 
    warn: 0, 
    error: 0, 
    debug: 0 
  });

  // Extrair fontes únicas dos logs
  useEffect(() => {
    const uniqueSources = Array.from(
      new Set(logs.map((log) => log.source || 'Desconhecido'))
    );
    setSources(uniqueSources);
  }, [logs]);

  // Auto-open on errors
  useEffect(() => {
    const hasRecentErrors = logs.some(log => log.level === 'error' && Date.now() - log.timestamp.getTime() < 5000);
    if (!isOpen && hasRecentErrors) {
      setIsOpen(true);
    }
  }, [logs, isOpen]);

  // Adicionar entrada de debug quando o painel é aberto ou fechado
  useEffect(() => {
    if (isDebugEnabled) {
      // Evitar adicionar log durante renderização
      const timer = setTimeout(() => {
        addLog('debug', `Debug Panel ${isOpen ? 'opened' : 'closed'}`, 'DebugPanel');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isDebugEnabled, addLog]);

  // Filtra os logs com base no nível, fonte e termo de pesquisa
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const levelMatch = filter ? log.level === filter : true;
      const sourceMatch = selectedSources.length === 0 || 
        selectedSources.includes(log.source || 'Desconhecido');
      const searchMatch = searchTerm === '' ||
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.source && log.source.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm.toLowerCase()));
      
      return levelMatch && sourceMatch && searchMatch;
    });
  }, [logs, filter, searchTerm, selectedSources]);

  const togglePanel = () => setIsOpen((prev) => !prev);

  // Alternar seleção de fonte
  const toggleSource = (source: string) => {
    setSelectedSources((prev) => 
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  // Exportar logs para arquivo
  const exportLogs = useCallback(() => {
    try {
      setIsLoading(true);
      const logsToExport = filteredLogs.length > 0 ? filteredLogs : logs;
      const data = JSON.stringify(
        logsToExport.map(log => ({
          timestamp: log.timestamp.toISOString(),
          level: log.level,
          source: log.source || 'Desconhecido',
          message: log.message,
          data: log.data
        })),
        null,
        2
      );
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${logsToExport.length} logs exportados para arquivo JSON`);
      
      addLog('info', `Exported ${logsToExport.length} logs to file`, 'DebugPanel');
    } catch (error) {
      toast.error(`Erro ao exportar logs: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      addLog('error', 'Failed to export logs', 'DebugPanel', error);
    } finally {
      setIsLoading(false);
    }
  }, [filteredLogs, logs, addLog]);

  // Limpar todos os logs com confirmação
  const handleClearLogs = useCallback(() => {
    if (logs.length > 0) {
      addLog('info', `Cleared ${logs.length} logs`, 'DebugPanel');
      clearLogs();
      toast.success("Todos os logs foram removidos do painel de debug");
    }
  }, [logs, clearLogs, addLog]);

  // Atualizar stats a cada 2 segundos
  useEffect(() => {
    const updateStats = () => {
      const newStats = {
        info: logs.filter(log => log.level === 'info').length,
        warn: logs.filter(log => log.level === 'warn').length,
        error: logs.filter(log => log.level === 'error').length,
        debug: logs.filter(log => log.level === 'debug').length,
        total: logs.length
      };
      setStats(newStats);
    };
    
    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, [logs]);

  // Styles para diferentes níveis de log
  const logStyles: Record<LogLevel, string> = {
    info: 'bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500',
    warn: 'bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-500',
    error: 'bg-red-50 dark:bg-red-950 border-l-4 border-red-500',
    debug: 'bg-purple-50 dark:bg-purple-950 border-l-4 border-purple-500',
  };

  // Estilos para badges de nível
  const getBadgeStyles = (level: LogLevel): string => {
    switch (level) {
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'debug':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return '';
    }
  };

  // Renderização do componente
  // Movido os hooks condicionais para fora das condições
  const renderDebugToggleButton = () => (
    <Button
      onClick={toggleDebug}
      className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg p-3"
      size="icon"
      variant="outline"
    >
      <Eye className="h-5 w-5" />
    </Button>
  );

  const renderClosedPanel = () => (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {/* Indicadores de status */}
      {stats.error > 0 && (
        <Badge variant="destructive" className="cursor-pointer self-end animate-pulse"
          onClick={togglePanel}>
          {stats.error} {stats.error > 1 ? 'erros' : 'erro'}
        </Badge>
      )}
    
      <Button
        onClick={togglePanel}
        className="rounded-full shadow-lg p-3 relative"
        size="icon"
        variant={stats.error > 0 ? "destructive" : "outline"}
      >
        <TerminalSquare className="h-5 w-5" />
        {logs.length > 0 && (
          <Badge className="absolute -top-2 -right-2 rounded-full text-xs min-w-[20px] h-5 flex items-center justify-center">
            {logs.length}
          </Badge>
        )}
      </Button>
    </div>
  );

  const renderOpenPanel = () => (
    <div className="fixed bottom-0 right-0 w-full md:w-4/5 lg:w-[30%] xl:w-[900px] h-full z-50 flex flex-col bg-background/95 backdrop-blur-sm border border-primary/20 dark:border-primary/30 shadow-xl rounded-t-lg overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-5 w-5 text-primary" />
          <span className="font-medium">Debug Panel</span>
          
          <div className="flex items-center gap-1 ml-2">
            <Badge variant="outline" className={`${filter === 'info' ? getBadgeStyles('info') : ''}`}>
              {stats.info} info
            </Badge>
            <Badge variant="outline" className={`${filter === 'warn' ? getBadgeStyles('warn') : ''}`}>
              {stats.warn} avisos
            </Badge>
            <Badge variant="outline" className={`${filter === 'error' ? getBadgeStyles('error') : ''}`}>
              {stats.error} erros
            </Badge>
            <Badge variant="outline" className={`${filter === 'debug' ? getBadgeStyles('debug') : ''}`}>
              {stats.debug} debug
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Buscar logs..."
            className="px-2 py-1 text-sm border rounded-md w-40 md:w-64 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Filtro por nível */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Filter className="h-4 w-4" />
                Nível
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem
                checked={filter === 'info'}
                onCheckedChange={() => setFilter('info')}
              >
                <Badge className={getBadgeStyles('info')}>Info</Badge>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filter === 'warn'}
                onCheckedChange={() => setFilter('warn')}
              >
                <Badge className={getBadgeStyles('warn')}>Warning</Badge>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filter === 'error'}
                onCheckedChange={() => setFilter('error')}
              >
                <Badge className={getBadgeStyles('error')}>Error</Badge>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filter === 'debug'}
                onCheckedChange={() => setFilter('debug')}
              >
                <Badge className={getBadgeStyles('debug')}>Debug</Badge>
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filtro por fonte */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Filter className="h-4 w-4" />
                Fonte
                {selectedSources.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedSources.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
              {sources.map((source) => (
                <DropdownMenuCheckboxItem
                  key={source}
                  checked={selectedSources.includes(source)}
                  onCheckedChange={() => toggleSource(source)}
                >
                  {source}
                </DropdownMenuCheckboxItem>
              ))}
              {sources.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedSources([])}>
                    Limpar seleção
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botões de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2 gap-1">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setAutoScroll(!autoScroll)}>
                {autoScroll ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {autoScroll ? 'Desativar auto-scroll' : 'Ativar auto-scroll'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportLogs} disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                Exportar logs
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClearLogs} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar logs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={toggleDebug} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <EyeOff className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={togglePanel} className="h-8 w-8">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-sm">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {logs.length > 0 
              ? 'Nenhum log corresponde aos filtros aplicados'
              : 'Nenhum log disponível'
            }
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className={`p-2 rounded ${logStyles[log.level]}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getBadgeStyles(log.level)}>{log.level}</Badge>
                {log.source && (
                  <Badge variant="outline" className="bg-background/50 hover:bg-background/80 cursor-pointer"
                    onClick={() => {
                      if (!selectedSources.includes(log.source || '')) {
                        setSelectedSources([...(selectedSources || []), log.source || '']);
                      } else {
                        setSelectedSources(selectedSources.filter(s => s !== log.source));
                      }
                    }}>
                    {log.source}
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs ml-auto">
                  {log.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words">{log.message}</div>
              {log.data && (
                <pre className="mt-1 p-1 bg-secondary/20 rounded text-xs overflow-x-auto">
                  {typeof log.data === 'object'
                    ? JSON.stringify(log.data, null, 2)
                    : String(log.data)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  // A decisão sobre o que renderizar fica aqui - sem condições para os hooks
  if (!isDebugEnabled) {
    return renderDebugToggleButton();
  }

  if (!isOpen) {
    return renderClosedPanel();
  }

  return renderOpenPanel();
} 