'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpDown,
  CheckCircle2,
  CircleDashed,
  FileText,
  FilterX,
  Loader2,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval } from 'date-fns';
import { useBarbershopId } from '@/context/BarbershopIdContext';
import { useToast } from '@/hooks/use-toast';

type Disparo = {
  id: string;
  dataEnvio: string;
  cliente: string;
  whatsapp: string;
  texto: string;
  situacao: number;
  tipo?: string;
};

type QueueItem = {
  id: string;
  agendadoPara: string;
  cliente: string;
  whatsapp: string;
  tipo?: string;
  status: string;
  lastError?: string | null;
};

const QUEUE_POLL_INTERVAL_MS = 60000;

const formatWhatsApp = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "-";

  const hasCountry = digits.startsWith("55") && digits.length > 11;
  const local = hasCountry ? digits.slice(2) : digits;

  if (local.length === 11) {
    const ddd = local.slice(0, 2);
    const part1 = local.slice(2, 3);
    const part2 = local.slice(3, 7);
    const part3 = local.slice(7);
    const formatted = `(${ddd}) ${part1} ${part2}-${part3}`;
    return hasCountry ? `+55 ${formatted}` : formatted;
  }

  if (local.length === 10) {
    const ddd = local.slice(0, 2);
    const part1 = local.slice(2, 6);
    const part2 = local.slice(6);
    const formatted = `(${ddd}) ${part1}-${part2}`;
    return hasCountry ? `+55 ${formatted}` : formatted;
  }

  return hasCountry ? `+55 ${local}` : local;
};

const normalizeLabel = (value?: string) =>
  (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const getTipoBadge = (tipo?: string) => {
  const normalized = normalizeLabel(tipo);

  if (normalized.includes("lembrete")) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30">
        {tipo || "Lembrete"}
      </Badge>
    );
  }

  if (normalized.includes("confirmacao manual")) {
    return (
      <Badge variant="outline" className="bg-slate-500/10 text-slate-200 border-slate-500/30">
        {tipo || "Confirmacao Manual"}
      </Badge>
    );
  }

  if (normalized.includes("confirmacao")) {
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
        {tipo || "Confirmacao"}
      </Badge>
    );
  }

  if (normalized.includes("pesquisa")) {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
        {tipo || "Pesquisa"}
      </Badge>
    );
  }

  return <Badge variant="outline">{tipo || "Generico"}</Badge>;
};

export default function WhatsappReportsPage() {
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isCancellingId, setIsCancellingId] = useState<string | null>(null);
  const [hasSyncedQueue, setHasSyncedQueue] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState("logs");
  const { barbershopId } = useBarbershopId();
  const { toast } = useToast();

  const fetchReports = useCallback(async () => {
    if (!barbershopId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reminders/logs?barbershopId=${barbershopId}`);
      if (!response.ok) throw new Error("Failed to fetch reports");
      const data = await response.json();
      const mapped: Disparo[] = (data?.data || []).map((log: any) => ({
        id: log.id,
        dataEnvio: log.sentAt,
        cliente: log.clientName || "",
        whatsapp: log.clientPhone || "",
        texto: log.message || "",
        situacao: log.status === "success" ? 1 : log.status === "skipped" ? 2 : 0,
        tipo: log.templateType || "Mensagem manual",
      }));
      setDisparos(mapped);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [barbershopId]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const fetchQueue = useCallback(async () => {
    if (!barbershopId) return;
    setIsQueueLoading(true);
    try {
      const syncParam = hasSyncedQueue ? "0" : "1";
      const response = await fetch(
        `/api/reminders/queue?barbershopId=${barbershopId}&status=pending&sync=${syncParam}`
      );
      if (!response.ok) throw new Error("Failed to fetch queue");
      const data = await response.json();
      const mapped: QueueItem[] = (data?.data || []).map((entry: any) => ({
        id: entry.id,
        agendadoPara: entry.scheduledFor,
        cliente: entry.clientName || "",
        whatsapp: entry.clientPhone || "",
        tipo: entry.templateType || "Lembrete de Agendamento",
        status: entry.status || "pending",
        lastError: entry.lastError || null,
      }));
      setQueueItems(mapped);
      setHasSyncedQueue(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsQueueLoading(false);
    }
  }, [barbershopId, hasSyncedQueue]);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    setHasSyncedQueue(false);
  }, [barbershopId]);

  const filteredDisparos = useMemo(() => {
    let filtered = [...disparos];
    if (selectedType !== "all") {
      const normalizedSelected = normalizeLabel(selectedType);
      filtered = filtered.filter((d) => normalizeLabel(d.tipo) === normalizedSelected);
    }
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.whatsapp.includes(lowercasedTerm) ||
          d.cliente.toLowerCase().includes(lowercasedTerm) ||
          d.tipo?.toLowerCase().includes(lowercasedTerm) ||
          d.texto.toLowerCase().includes(lowercasedTerm)
      );
    }
    if (dateRange?.from) {
      const to = dateRange.to || dateRange.from;
      filtered = filtered.filter((d) =>
        isWithinInterval(new Date(d.dataEnvio), { start: dateRange.from!, end: to })
      );
    }
    return filtered;
  }, [disparos, searchTerm, dateRange]);

  const filteredQueue = useMemo(() => {
    let filtered = [...queueItems];
    if (selectedType !== "all") {
      const normalizedSelected = normalizeLabel(selectedType);
      filtered = filtered.filter((d) => normalizeLabel(d.tipo) === normalizedSelected);
    }
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.whatsapp.includes(lowercasedTerm) ||
          d.cliente.toLowerCase().includes(lowercasedTerm) ||
          d.tipo?.toLowerCase().includes(lowercasedTerm)
      );
    }
    if (dateRange?.from) {
      const to = dateRange.to || dateRange.from;
      filtered = filtered.filter((d) =>
        isWithinInterval(new Date(d.agendadoPara), { start: dateRange.from!, end: to })
      );
    }
    return filtered;
  }, [queueItems, searchTerm, dateRange]);

  const clearFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setSelectedType("all");
  };

  const handleProcessQueue = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!barbershopId || isProcessingQueue) return;
      setIsProcessingQueue(true);
      try {
        const response = await fetch("/api/reminders/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barbershopId }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || data?.message || "Erro ao processar fila.");
        }
        await Promise.all([fetchReports(), fetchQueue()]);
        if (!opts.silent) {
          toast({
            title: "Fila processada",
            description: data?.message || "Lembretes enviados com sucesso.",
          });
        }
      } catch (error: any) {
        if (!opts.silent) {
          toast({
            variant: "destructive",
            title: "Erro ao processar fila",
            description: error?.message || "Nao foi possivel disparar os lembretes.",
          });
        }
      } finally {
        setIsProcessingQueue(false);
      }
    },
    [barbershopId, fetchQueue, fetchReports, isProcessingQueue, toast]
  );

  const handleCancelQueue = useCallback(
    async (queueId: string) => {
      if (!queueId) return;
      setIsCancellingId(queueId);
      try {
        const response = await fetch(`/api/reminders/queue/${queueId}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || data?.message || "Erro ao cancelar disparo.");
        }
        await fetchQueue();
        toast({
          title: "Disparo cancelado",
          description: "O envio foi removido da fila.",
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro ao cancelar",
          description: error?.message || "Nao foi possivel cancelar o disparo.",
        });
      } finally {
        setIsCancellingId(null);
      }
    },
    [fetchQueue, toast]
  );

  useEffect(() => {
    if (activeTab !== "queue" || !queueItems.length) return;
    const now = Date.now();
    const hasDue = queueItems.some((item) => {
      const when = new Date(item.agendadoPara).getTime();
      return Number.isFinite(when) && when <= now;
    });
    if (!hasDue) return;
    void handleProcessQueue({ silent: true });
  }, [activeTab, handleProcessQueue, queueItems]);

  useEffect(() => {
    if (activeTab !== "queue" || !barbershopId) return;
    const intervalId = setInterval(() => {
      void handleProcessQueue({ silent: true });
    }, QUEUE_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [activeTab, barbershopId, handleProcessQueue]);

  const getStatus = (situacao: number) => {
    switch (situacao) {
      case 1:
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Enviado
          </Badge>
        );
      case 2:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            <CircleDashed className="mr-1 h-3 w-3" />
            Ignorado
          </Badge>
        );
      case 0:
      default:
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Falhou
          </Badge>
        );
    }
  };

  const getQueueStatus = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            <CircleDashed className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Enviado
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-muted/30">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelado
          </Badge>
        );
      case "error":
      default:
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Falhou
          </Badge>
        );
    }
  };

  const typeOptions = useMemo(() => {
    const types = new Set<string>();
    disparos.forEach((item) => item.tipo && types.add(item.tipo));
    queueItems.forEach((item) => item.tipo && types.add(item.tipo));
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [disparos, queueItems]);

  return (
    <div className="space-y-6">
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText />
              Relatorio de Disparos de WhatsApp
            </CardTitle>
            <CardDescription>
              Acompanhe o historico de mensagens enviadas e a fila de envios do WhatsApp.
            </CardDescription>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="logs">Historico</TabsTrigger>
              <TabsTrigger value="queue">Fila de envio</TabsTrigger>
            </TabsList>
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, numero ou texto..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {typeOptions.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              <Button variant="ghost" onClick={clearFilters}>
                <FilterX className="mr-2 h-4 w-4" />
                Limpar
              </Button>
              {activeTab === "queue" && (
                <Button
                  type="button"
                  onClick={() => void handleProcessQueue()}
                  disabled={isProcessingQueue}
                  className="gap-2"
                >
                  {isProcessingQueue && <Loader2 className="h-4 w-4 animate-spin" />}
                  Processar fila
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="logs">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm">
                        Data e Hora <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Numero (WhatsApp)</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : filteredDisparos.length > 0 ? (
                    filteredDisparos.map((disparo) => (
                      <TableRow key={disparo.id}>
                        <TableCell>
                          {format(new Date(disparo.dataEnvio), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>{disparo.cliente || "-"}</TableCell>
                        <TableCell>{formatWhatsApp(disparo.whatsapp)}</TableCell>
                        <TableCell>{getTipoBadge(disparo.tipo)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {disparo.texto}
                        </TableCell>
                        <TableCell>{getStatus(disparo.situacao)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Nenhum disparo encontrado para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="queue">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm">
                        Agendado para <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Numero (WhatsApp)</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isQueueLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : filteredQueue.length > 0 ? (
                    filteredQueue.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.agendadoPara ? format(new Date(item.agendadoPara), 'dd/MM/yyyy HH:mm') : "-"}
                        </TableCell>
                        <TableCell>{item.cliente || "-"}</TableCell>
                        <TableCell>{formatWhatsApp(item.whatsapp)}</TableCell>
                        <TableCell>{getTipoBadge(item.tipo)}</TableCell>
                        <TableCell>{getQueueStatus(item.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => void handleCancelQueue(item.id)}
                            disabled={isCancellingId === item.id}
                          >
                            {isCancellingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Nenhuma mensagem pendente na fila.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
