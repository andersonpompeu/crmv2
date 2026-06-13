import React, { useState, useEffect } from "react";
import { 
  Search, 
  Trash2, 
  RefreshCw, 
  FileCode, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  Copy, 
  Check, 
  Info,
  ChevronDown,
  ChevronUp,
  Cpu
} from "lucide-react";
import { WebhookLog } from "../types";

export function WebhookLogsTable() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/webhook-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch webhook logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm("Deseja realmente excluir permanentemente todo o histórico de logs de webhook?")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/webhook-logs", { method: "DELETE" });
      if (res.ok) {
        setLogs([]);
        setExpandedLogId(null);
      }
    } catch (err) {
      console.error("Failed to clear webhook logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to format payload string
  const formatPayload = (payloadStr: string) => {
    try {
      const parsed = JSON.parse(payloadStr);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return payloadStr;
    }
  };

  // Filters logic
  const filteredLogs = logs.filter(log => {
    const textToMatch = `${log.payload} ${log.errorMessage || ""} ${log.templateName || ""} ${log.userAgent || ""} ${log.ipAddress || ""}`.toLowerCase();
    const matchesSearch = textToMatch.includes(searchTerm.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "success") return matchesSearch && log.status >= 200 && log.status < 300;
    if (statusFilter === "error-client") return matchesSearch && log.status >= 400 && log.status < 500;
    if (statusFilter === "error-server") return matchesSearch && log.status >= 500;
    return matchesSearch;
  });

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {status} Sucesso
        </span>
      );
    }
    if (status >= 400 && status < 500) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5" />
          {status} Inválido
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-800 border border-rose-200">
        <XCircle className="w-3.5 h-3.5" />
        {status} Falha
      </span>
    );
  };

  return (
    <div className="bg-slate-900/40 rounded-xl border border-slate-800/80 p-6 shadow-xl backdrop-blur-md">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            Logs de Webhook e Capturas
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Grave, inspecione e depure tentativas de entrada de leads geradas por formulários integrados em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700/60 disabled:opacity-50"
            title="Atualizar Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={clearLogs}
            disabled={loading || logs.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-200 transition border border-rose-900/50 disabled:opacity-50"
            title="Limpar Tabela"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar Histórico</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
        <div className="md:col-span-8 relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por conteúdo do payload, erro, user-agent, IP ou canal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/65 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm transition outline-none placeholder-slate-500"
          />
        </div>

        <div className="md:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950/65 border border-slate-800 text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-3 py-2 text-sm outline-none transition"
          >
            <option value="all">Filtro: Todos os Status</option>
            <option value="success">Apenas Sucessos (2xx)</option>
            <option value="error-client">Apenas Erros de Validação (4xx)</option>
            <option value="error-server">Apenas Falhas do Servidor (500)</option>
          </select>
        </div>
      </div>

      {/* Logs Main Table */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg bg-slate-950/20">
          <FileCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300">Nenhum log encontrado</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm || statusFilter !== "all" 
              ? "Tente limpar os filtros ou realizar outra busca." 
              : "As tentativas de capturas ou envios integrados aparecerão instantaneamente aqui."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-800/80 rounded-xl bg-slate-950/30">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-950 md:bg-slate-900/60 border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Canal / Origem</th>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5 hidden md:table-cell">Endereço IP</th>
                  <th className="px-4 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const formattedText = formatPayload(log.payload);
                  
                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className={`hover:bg-slate-800/25 transition-colors cursor-pointer group ${isExpanded ? "bg-slate-850/30" : ""}`}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <td className="px-4 py-3">
                          {getStatusBadge(log.status)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-250">
                          {log.templateName || "Geral"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(log.timestamp).toLocaleString("pt-BR")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono hidden md:table-cell">
                          {log.ipAddress || "Local"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedLogId(isExpanded ? null : log.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700/50"
                          >
                            <span>{isExpanded ? "Fechar" : "Inspecionar"}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Inspect Panel */}
                      {isExpanded && (
                        <tr className="bg-slate-900/50 border-t border-b border-slate-800/80">
                          <td colSpan={5} className="p-5">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                              <div className="lg:col-span-8 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                                    <Cpu className="w-4 h-4 text-indigo-400" />
                                    Payload Capturado (JSON do Body)
                                  </span>
                                  <button
                                    onClick={() => handleCopy(log.id, formattedText)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
                                  >
                                    {copiedId === log.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400">Copiado!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copiar Payload</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="text-xs font-mono bg-slate-950 p-4 rounded-lg overflow-x-auto text-sky-400 border border-slate-800 shadow-inner select-all leading-relaxed whitespace-pre-wrap max-h-96">
                                  {formattedText}
                                </pre>
                              </div>

                              <div className="lg:col-span-4 flex flex-col justify-start gap-4 p-4 rounded-lg bg-slate-950/55 border border-slate-800 text-xs">
                                <div className="border-b border-slate-800 pb-2">
                                  <h4 className="font-semibold text-slate-300 text-sm flex items-center gap-1">
                                    <Info className="w-4 h-4 text-indigo-400" />
                                    Detalhes do Log
                                  </h4>
                                </div>
                                
                                <div className="space-y-3 font-medium">
                                  <div>
                                    <span className="text-slate-500 block mb-0.5">Identificador do Log</span>
                                    <span className="text-slate-300 font-mono bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded text-[11px] block text-ellipsis overflow-hidden">
                                      {log.id}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-slate-500 block mb-0.5">Mensagem de Resposta</span>
                                    {log.errorMessage ? (
                                      <span className="font-medium text-rose-400 block break-words">
                                        {log.errorMessage}
                                      </span>
                                    ) : (
                                      <span className="text-emerald-400 block font-medium">
                                        Entrada processada com sucesso. Lead cadastrado.
                                      </span>
                                    )}
                                  </div>

                                  <div>
                                    <span className="text-slate-500 block mb-0.5">Dispositivo / Agente</span>
                                    <span className="text-slate-400 block leading-relaxed break-words font-mono text-[11px]">
                                      {log.userAgent || "Nenhum agente informado"}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-slate-500 block mb-0.5">IP de Conexão</span>
                                    <span className="text-slate-300 block font-mono">
                                      {log.ipAddress || "Localhost"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
