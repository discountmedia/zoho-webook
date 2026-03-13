import React, { useState, useEffect } from "react";
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  FileJson, 
  History, 
  Play, 
  Search, 
  Terminal,
  Trash2,
  AlertTriangle,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LogEntry, Severity } from "./types";
import { analyzeLog } from "./services/geminiService";

export default function App() {
  const [payload, setPayload] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [isAutoAnalyzeEnabled, setIsAutoAnalyzeEnabled] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        // Update selected entry if it exists in the new data
        if (selectedEntry) {
          const updated = data.find((e: LogEntry) => e.id === selectedEntry.id);
          if (updated) setSelectedEntry(updated);
        }
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    }
  };

  // Auto-Analysis Engine
  useEffect(() => {
    if (!isAutoAnalyzeEnabled || isAnalyzing) return;

    const pendingLog = history.find(log => !log.is_analyzed);
    if (pendingLog) {
      console.log("Auto-analyzing log:", pendingLog.id);
      handleAnalyze(pendingLog.raw_payload, pendingLog.id);
    }
  }, [history, isAutoAnalyzeEnabled, isAnalyzing]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5s for faster auto-analysis
    return () => clearInterval(interval);
  }, [selectedEntry?.id]);

  const saveLog = async (entry: LogEntry) => {
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      await fetchLogs();
    } catch (e) {
      console.error("Failed to save log", e);
    }
  };

  const handleAnalyze = async (manualPayload?: string, existingId?: string) => {
    const targetPayload = manualPayload || payload;
    if (!targetPayload.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzeLog(targetPayload);
      const entry: LogEntry = {
        id: existingId || crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        raw_payload: targetPayload,
        path: result.path as any,
        result: result.result as any,
        failure_reason: result.failure_reason || "",
        how_to_reproduce: result.how_to_reproduce || "",
        fix_owner: result.fix_owner as any,
        fix_description: result.fix_description || "",
        severity: result.severity as any,
        notes: result.notes || "",
        is_analyzed: 1,
      };
      
      await saveLog(entry);
      setSelectedEntry(entry);
      if (!existingId) setPayload("");
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/logs/${id}`, { method: "DELETE" });
      setHistory(prev => prev.filter(item => item.id !== id));
      if (selectedEntry?.id === id) setSelectedEntry(null);
    } catch (e) {
      console.error("Failed to delete log", e);
    }
  };

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case "critical": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "warning": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "info": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      default: return "text-zinc-500 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  const getSeverityIcon = (severity: Severity) => {
    switch (severity) {
      case "critical": return <AlertCircle className="w-4 h-4" />;
      case "warning": return <AlertTriangle className="w-4 h-4" />;
      case "info": return <Info className="w-4 h-4" />;
      default: return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] flex items-center justify-center rounded-sm">
            <Terminal className="text-[#E4E3E0] w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif italic text-xl leading-tight">Equipment Assistant</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 font-mono">Session Log Analyzer v1.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 border border-[#141414] bg-white/50">
            <span className="text-[10px] uppercase font-bold opacity-40">Auto-Analyze</span>
            <button 
              onClick={() => setIsAutoAnalyzeEnabled(!isAutoAnalyzeEnabled)}
              className={`w-8 h-4 rounded-full relative transition-colors ${isAutoAnalyzeEnabled ? 'bg-emerald-500' : 'bg-zinc-300'}`}
            >
              <motion.div 
                animate={{ x: isAutoAnalyzeEnabled ? 16 : 2 }}
                className="absolute top-1 w-2 h-2 bg-white rounded-full"
              />
            </button>
          </div>
          <button 
            onClick={() => setShowWebhookInfo(!showWebhookInfo)}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#141414] text-[10px] uppercase font-bold hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
          >
            <Terminal className="w-3 h-3" />
            Webhook Setup
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase font-mono opacity-50">Engine Status</p>
            <p className="text-xs font-mono flex items-center gap-1.5 justify-end">
              <span className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-amber-500 animate-pulse' : isAutoAnalyzeEnabled ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
              {isAnalyzing ? 'Processing' : isAutoAnalyzeEnabled ? 'Scanning' : 'Idle'}
            </p>
          </div>
        </div>
      </header>

      {showWebhookInfo && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="bg-[#141414] text-[#E4E3E0] border-b border-[#E4E3E0]/20 overflow-hidden"
        >
          <div className="max-w-[1600px] mx-auto p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest mb-1">Webhook Configuration</h3>
              <p className="text-[11px] opacity-60 font-mono">Point your SalesIQ webhooks to the following endpoint:</p>
            </div>
            <div className="flex-1 max-w-2xl w-full">
              <div className="bg-white/10 p-3 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-white/10">
                <div className="flex flex-col gap-1">
                  <code className="text-xs font-mono break-all opacity-80">https://zoho-hook-6969-434173836831.us-central1.run.app/api/webhook</code>
                  <span className="text-[9px] uppercase tracking-wider opacity-40 font-bold">Production Endpoint</span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={async () => {
                      try {
                        await fetch("/api/webhook", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ 
                            type: "test_event", 
                            visitor: { name: "Test Visitor" },
                            transcript: "Visitor: Hello, I need a quote.\nBot: Sure, I can help with that!" 
                          })
                        });
                        fetchLogs();
                      } catch (e) {
                        console.error("Test failed", e);
                      }
                    }}
                    className="flex-1 sm:flex-none px-3 py-1 bg-emerald-500 text-white text-[10px] uppercase font-bold hover:bg-emerald-600 transition-colors"
                  >
                    Send Test
                  </button>
                  <button 
                    onClick={() => navigator.clipboard.writeText("https://zoho-hook-6969-434173836831.us-central1.run.app/api/webhook")}
                    className="flex-1 sm:flex-none px-3 py-1 bg-white text-[#141414] text-[10px] uppercase font-bold hover:bg-zinc-200 transition-colors"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
              <div className="mt-2 px-1 flex justify-between items-center">
                <span className="text-[10px] opacity-40 font-mono">Path: /home/discountforkliftmedia/zoho-hook</span>
                <span className="text-[10px] opacity-40 font-mono">Status: HEAD Validation Active</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-89px)]">
        {/* Left Panel: Input & History */}
        <div className="lg:col-span-4 border-r border-[#141414] flex flex-col bg-white/20">
          {/* Input Section */}
          <div className="p-6 border-b border-[#141414]">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[11px] uppercase tracking-wider font-serif italic opacity-60">Raw Webhook Payload</label>
              <FileJson className="w-4 h-4 opacity-30" />
            </div>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="Paste SalesIQ JSON payload here..."
              className="w-full h-48 bg-white border border-[#141414] p-4 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#141414] resize-none placeholder:opacity-30"
            />
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !payload.trim()}
              className="w-full mt-4 bg-[#141414] text-[#E4E3E0] py-3 flex items-center justify-center gap-2 uppercase text-[11px] tracking-widest font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Analyzing Transcript...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Execute Analysis
                </>
              )}
            </button>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-[11px] flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </div>

          {/* History Section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#141414] flex items-center justify-between bg-zinc-100/50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 opacity-50" />
                <span className="text-[11px] uppercase tracking-wider font-serif italic opacity-60">Recent Sessions</span>
              </div>
              <span className="text-[10px] font-mono opacity-40">{history.length} Entries</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-12 text-center opacity-30">
                  <Search className="w-8 h-8 mx-auto mb-3" />
                  <p className="text-xs italic font-serif">No analysis history found</p>
                </div>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`group p-4 border-b border-[#141414]/10 cursor-pointer transition-all hover:bg-[#141414] hover:text-[#E4E3E0] ${
                      selectedEntry?.id === entry.id ? "bg-[#141414] text-[#E4E3E0]" : "bg-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono opacity-50">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button 
                        onClick={(e) => deleteEntry(entry.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      {entry.is_analyzed ? (
                        <>
                          <div className={`px-1.5 py-0.5 text-[9px] uppercase font-bold border ${getSeverityColor(entry.severity)}`}>
                            {entry.severity}
                          </div>
                          <h3 className="text-xs font-bold truncate">{entry.result}</h3>
                        </>
                      ) : (
                        <>
                          <div className="px-1.5 py-0.5 text-[9px] uppercase font-bold border border-zinc-400 text-zinc-400">
                            PENDING
                          </div>
                          <h3 className="text-xs font-bold truncate italic opacity-50">Awaiting Analysis</h3>
                        </>
                      )}
                    </div>
                    <p className="text-[10px] opacity-60 truncate font-mono">{entry.is_analyzed ? entry.path : "Raw Webhook Payload"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Details */}
        <div className="lg:col-span-8 overflow-y-auto bg-white/40">
          <AnimatePresence mode="wait">
            {selectedEntry ? (
              <motion.div
                key={selectedEntry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 lg:p-12"
              >
                {/* Status Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 border-b border-[#141414] pb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {selectedEntry.is_analyzed ? (
                        <>
                          <span className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase border ${getSeverityColor(selectedEntry.severity)}`}>
                            {getSeverityIcon(selectedEntry.severity)}
                            {selectedEntry.severity} Priority
                          </span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase border border-zinc-400 text-zinc-400">
                          <Clock className="w-3 h-3" />
                          Pending Analysis
                        </span>
                      )}
                      <span className="text-[10px] font-mono opacity-40">ID: {selectedEntry.id.split('-')[0]}</span>
                    </div>
                    <h2 className="text-4xl font-serif italic leading-tight">
                      {selectedEntry.is_analyzed ? selectedEntry.result : "Incoming Webhook"}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-mono opacity-50 mb-1">Timestamp</p>
                    <p className="text-sm font-mono">{new Date(selectedEntry.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                {!selectedEntry.is_analyzed ? (
                  <div className="bg-zinc-100 border border-[#141414] p-12 text-center">
                    <Activity className="w-12 h-12 mx-auto mb-6 opacity-20" />
                    <h3 className="text-xl font-serif italic mb-4">This session has not been analyzed yet</h3>
                    <p className="text-xs font-mono opacity-50 max-w-md mx-auto mb-8">
                      This log was received via webhook. Click the button below to process the transcript using the Equipment Assistant logic.
                    </p>
                    <button
                      onClick={() => handleAnalyze(selectedEntry.raw_payload, selectedEntry.id)}
                      disabled={isAnalyzing}
                      className="bg-[#141414] text-[#E4E3E0] px-8 py-3 uppercase text-[11px] tracking-widest font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                      {isAnalyzing ? "Processing..." : "Run Analysis Now"}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Column 1 */}
                  <div className="space-y-10">
                    <section>
                      <h4 className="text-[11px] uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3" />
                        Routing Path
                      </h4>
                      <div className="p-4 bg-white border border-[#141414] font-mono text-sm">
                        {selectedEntry.path}
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[11px] uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3" />
                        Failure Diagnostics
                      </h4>
                      <div className="space-y-4">
                        <div className="p-4 bg-white border border-[#141414]">
                          <p className="text-[10px] uppercase font-mono opacity-40 mb-2">Root Cause</p>
                          <p className="text-sm italic font-serif">{selectedEntry.failure_reason || "No failure detected in this session."}</p>
                        </div>
                        {selectedEntry.how_to_reproduce && (
                          <div className="p-4 bg-white border border-[#141414]">
                            <p className="text-[10px] uppercase font-mono opacity-40 mb-2">Reproduction Steps</p>
                            <p className="text-xs font-mono whitespace-pre-line leading-relaxed">{selectedEntry.how_to_reproduce}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  {/* Column 2 */}
                  <div className="space-y-10">
                    <section>
                      <h4 className="text-[11px] uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3" />
                        Remediation Plan
                      </h4>
                      <div className="space-y-4">
                        <div className="p-4 bg-white border border-[#141414] flex justify-between items-center">
                          <div>
                            <p className="text-[10px] uppercase font-mono opacity-40 mb-1">Fix Owner</p>
                            <p className="text-sm font-bold">{selectedEntry.fix_owner}</p>
                          </div>
                          <div className="w-10 h-10 rounded-full border border-[#141414]/10 flex items-center justify-center">
                            <CheckCircle2 className={`w-5 h-5 ${selectedEntry.fix_owner === 'N/A' ? 'opacity-20' : 'text-emerald-500'}`} />
                          </div>
                        </div>
                        <div className="p-4 bg-white border border-[#141414]">
                          <p className="text-[10px] uppercase font-mono opacity-40 mb-2">Resolution Steps</p>
                          <p className="text-xs leading-relaxed">{selectedEntry.fix_description || "No remediation required."}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[11px] uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3" />
                        Analyst Notes
                      </h4>
                      <div className="p-6 bg-[#141414] text-[#E4E3E0] font-mono text-xs leading-relaxed min-h-[120px]">
                        {selectedEntry.notes || "No additional observations recorded."}
                      </div>
                    </section>
                  </div>
                </div>
              )}

                {/* Raw Data Toggle */}
                <div className="mt-16 pt-8 border-t border-[#141414]/10">
                  <details className="group">
                    <summary className="list-none cursor-pointer flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold opacity-30 hover:opacity-100 transition-opacity">
                      <FileJson className="w-3 h-3" />
                      View Raw Payload
                    </summary>
                    <div className="mt-4 p-4 bg-zinc-100 border border-[#141414]/10 overflow-x-auto">
                      <pre className="text-[10px] font-mono leading-tight opacity-60">
                        {selectedEntry.raw_payload}
                      </pre>
                    </div>
                  </details>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 border border-[#141414]/10 rounded-full flex items-center justify-center mb-8">
                  <Activity className="w-10 h-10 opacity-10" />
                </div>
                <h2 className="text-2xl font-serif italic mb-2">Awaiting Data Input</h2>
                <p className="text-sm opacity-40 max-w-sm font-mono">
                  Paste a SalesIQ webhook payload in the left panel to begin automated session analysis.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#141414] p-4 bg-white/50 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-mono opacity-40">Engine</span>
              <span className="text-[10px] font-mono font-bold">Gemini 3.1 Pro</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-mono opacity-40">Thinking</span>
              <span className="text-[10px] font-mono font-bold">High</span>
            </div>
          </div>
          <p className="text-[9px] uppercase font-mono opacity-40 tracking-widest">
            &copy; 2026 Discount Forklift Brokers &bull; Confidential
          </p>
        </div>
      </footer>
    </div>
  );
}

