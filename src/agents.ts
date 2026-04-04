import { readFileSync, writeFileSync, existsSync } from "fs";

export interface AgentInfo {
  agentId: string;
  ensName: string;
  address: string;
  spendLimit: string;
  active: boolean;
  threatScore: number;
  strikes: number;
  lastAction: string;
  lastActionTime: string;
  registeredAt: string;
}

const AGENTS_FILE = "agents.json";

export class AgentTracker {
  private agents: Map<string, AgentInfo>;
  private dirty = false;

  constructor() {
    this.agents = new Map();
    if (existsSync(AGENTS_FILE)) {
      try {
        const data = JSON.parse(readFileSync(AGENTS_FILE, "utf-8")) as AgentInfo[];
        data.forEach((a) => this.agents.set(a.agentId, a));
      } catch {
        // Start fresh
      }
    }
    setInterval(() => this.flush(), 30_000);
  }

  register(agentId: string, data: Partial<AgentInfo>): void {
    const existing = this.agents.get(agentId);
    this.agents.set(agentId, {
      agentId,
      ensName: data.ensName || `${agentId}.enshell.eth`,
      address: data.address || "",
      spendLimit: data.spendLimit || "0",
      active: data.active !== undefined ? data.active : true,
      threatScore: existing?.threatScore || 0,
      strikes: existing?.strikes || 0,
      lastAction: existing?.lastAction || "",
      lastActionTime: existing?.lastActionTime || "",
      registeredAt: existing?.registeredAt || new Date().toISOString(),
    });
    this.dirty = true;
  }

  update(agentId: string, data: Partial<AgentInfo>): boolean {
    const existing = this.agents.get(agentId);
    if (!existing) return false;

    if (data.active !== undefined) existing.active = data.active;
    if (data.ensName) existing.ensName = data.ensName;
    if (data.address) existing.address = data.address;
    if (data.spendLimit) existing.spendLimit = data.spendLimit;

    this.dirty = true;
    return true;
  }

  updateFromAnalysis(agentId: string, score: number, decision: number, instruction: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      // Agent not registered via SDK yet - create a stub
      this.register(agentId, {});
    }
    const a = this.agents.get(agentId)!;
    a.threatScore = score;
    if (score >= 40000) a.strikes++;
    if (a.strikes >= 5) a.active = false;

    const decisionLabel = decision === 1 ? "APPROVED" : decision === 2 ? "ESCALATED" : "BLOCKED";
    a.lastAction = `${decisionLabel}: ${instruction.substring(0, 60)}`;
    a.lastActionTime = new Date().toISOString();
    this.dirty = true;
  }

  getAll(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  get(agentId: string): AgentInfo | undefined {
    return this.agents.get(agentId);
  }

  flush(): void {
    if (!this.dirty) return;
    try {
      writeFileSync(AGENTS_FILE, JSON.stringify(this.getAll(), null, 2));
      this.dirty = false;
    } catch {
      // Ignore
    }
  }
}
