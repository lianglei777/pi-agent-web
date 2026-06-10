import type { AgentCommand } from "@/server/domain/agent-command";
import type { AgentEvent } from "@/server/domain/agent-event";
import type { AgentRuntimeState } from "@/server/domain/agent-state";

export interface AgentRuntime {
  readonly sessionId: string;
  readonly sessionFile: string;
  isAlive(): boolean;
  execute<T = unknown>(command: AgentCommand): Promise<T>;
  getState(): Promise<AgentRuntimeState>;
  subscribe(listener: (event: AgentEvent) => void): () => void;
  destroy(): void;
}

export interface CreateRuntimeInput {
  requestedSessionId?: string;
  sessionFile?: string;
  cwd: string;
  toolNames?: string[];
}

export interface AgentRuntimeFactory {
  create(input: CreateRuntimeInput): Promise<AgentRuntime>;
}

export interface AgentRuntimeRegistry {
  get(sessionId: string): AgentRuntime | undefined;
  getOrStart(
    key: string,
    factory: () => Promise<AgentRuntime>,
  ): Promise<AgentRuntime>;
  register(sessionId: string, runtime: AgentRuntime): void;
  remove(sessionId: string): void;
  destroy(sessionId: string): void;
  touch(sessionId: string): void;
}

