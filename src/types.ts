export type Path = "Human Handoff" | "Quote Request" | "Dismissed" | "Restarted" | "Unknown";

export type Result = 
  | "✅ Completed" 
  | "⚠️ Operator Offline" 
  | "⚠️ Operators Unavailable" 
  | "⚠️ Visitor Restarted" 
  | "➖ Dismissed" 
  | "❌ Forward Execution Error" 
  | "❌ Quote Path Broken";

export type Severity = "critical" | "warning" | "info" | "none";

export interface LogEntry {
  id: string;
  timestamp: string;
  path: Path;
  result: Result;
  failure_reason: string;
  how_to_reproduce: string;
  fix_owner: "Internal" | "Zoho Support" | "N/A";
  fix_description: string;
  severity: Severity;
  notes: string;
  raw_payload?: string;
  is_analyzed?: number;
}
