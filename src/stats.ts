import { readFileSync, writeFileSync, existsSync } from "fs";

export interface Stats {
  agentsRegistered: number;
  actionsScanned: number;
  threatsBlocked: number;
  actionsEscalated: number;
  actionsApproved: number;
  knownAgents: string[];
}

const STATS_FILE = "stats.json";

const defaultStats: Stats = {
  agentsRegistered: 0,
  actionsScanned: 0,
  threatsBlocked: 0,
  actionsEscalated: 0,
  actionsApproved: 0,
  knownAgents: [],
};

export class StatsTracker {
  private stats: Stats;
  private dirty = false;

  constructor() {
    if (existsSync(STATS_FILE)) {
      try {
        this.stats = JSON.parse(readFileSync(STATS_FILE, "utf-8"));
      } catch {
        this.stats = { ...defaultStats };
      }
    } else {
      this.stats = { ...defaultStats };
    }

    // Persist every 30 seconds if dirty
    setInterval(() => this.flush(), 30_000);
  }

  recordRegistration(agentId: string): void {
    if (agentId && !this.stats.knownAgents.includes(agentId)) {
      this.stats.knownAgents.push(agentId);
      this.stats.agentsRegistered = this.stats.knownAgents.length;
      this.dirty = true;
    }
  }

  recordAnalysis(agentId: string, decision: number): void {
    this.stats.actionsScanned++;

    if (decision === 1) this.stats.actionsApproved++;
    if (decision === 2) this.stats.actionsEscalated++;
    if (decision === 3) this.stats.threatsBlocked++;

    this.recordRegistration(agentId);
    this.dirty = true;
  }

  getStats(): Omit<Stats, "knownAgents"> {
    const { knownAgents, ...public_ } = this.stats;
    return public_;
  }

  flush(): void {
    if (!this.dirty) return;
    try {
      writeFileSync(STATS_FILE, JSON.stringify(this.stats, null, 2));
      this.dirty = false;
    } catch {
      // Ignore write errors (e.g., read-only filesystem)
    }
  }
}
