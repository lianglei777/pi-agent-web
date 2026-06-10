import { randomUUID } from "node:crypto";
import type {
  AgentCommand,
  ImageInput,
  ThinkingLevel,
} from "@/server/domain/agent-command";
import { AppError } from "@/server/domain/app-error";
import type { AgentEvent } from "@/server/domain/agent-event";
import type {
  AgentRuntime,
  AgentRuntimeFactory,
  AgentRuntimeRegistry,
} from "@/server/ports/agent-runtime";
import type { WorkspaceRootProvider } from "@/server/ports/file-system";
import type { SessionRepository } from "@/server/ports/session-repository";

export interface CreateAgentRequest {
  cwd: string;
  message: string;
  images?: ImageInput[];
  provider?: string;
  modelId?: string;
  thinkingLevel?: ThinkingLevel;
  toolNames?: string[];
}

export class AgentService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly runtimes: AgentRuntimeRegistry,
    private readonly runtimeFactory: AgentRuntimeFactory,
    private readonly roots: WorkspaceRootProvider,
  ) {}

  async createAndPrompt(
    input: CreateAgentRequest,
  ): Promise<{ sessionId: string }> {
    this.roots.addRoot(input.cwd);
    const startKey = `new:${randomUUID()}`;
    const runtime = await this.runtimes.getOrStart(startKey, () =>
      this.runtimeFactory.create({
        cwd: input.cwd,
        toolNames: input.toolNames,
      }),
    );
    if (input.provider && input.modelId) {
      await runtime.execute({
        type: "set_model",
        provider: input.provider,
        modelId: input.modelId,
      });
    }
    if (input.thinkingLevel) {
      await runtime.execute({
        type: "set_thinking_level",
        level: input.thinkingLevel,
      });
    }
    if (input.toolNames) {
      await runtime.execute({ type: "set_tools", toolNames: input.toolNames });
    }
    this.runInBackground(runtime, {
      type: "prompt",
      message: input.message,
      images: input.images,
    });
    return { sessionId: runtime.sessionId };
  }

  async execute<T>(
    sessionId: string,
    command: AgentCommand,
  ): Promise<T> {
    const runtime = await this.getOrRestore(sessionId);
    this.runtimes.touch(sessionId);

    if (command.type === "prompt") {
      this.runInBackground(runtime, command);
      return { accepted: true } as T;
    }
    if (command.type === "fork") {
      const result = await runtime.execute<{
        sessionId: string;
        sessionFile: string;
      }>(command);
      this.runtimes.destroy(sessionId);
      return result as T;
    }
    return runtime.execute<T>(command);
  }

  async getSnapshot(sessionId: string) {
    const runtime = this.runtimes.get(sessionId);
    return runtime
      ? { loaded: true as const, state: await runtime.getState() }
      : { loaded: false as const };
  }

  async subscribe(
    sessionId: string,
    listener: (event: AgentEvent) => void,
  ): Promise<() => void> {
    const runtime = await this.getOrRestore(sessionId);
    this.runtimes.touch(sessionId);
    return runtime.subscribe((event) => {
      this.runtimes.touch(sessionId);
      listener(event);
    });
  }

  private async getOrRestore(sessionId: string): Promise<AgentRuntime> {
    return this.runtimes.getOrStart(sessionId, async () => {
      const detail = await this.sessions.findById(sessionId);
      if (!detail) {
        throw new AppError(
          "SESSION_NOT_FOUND",
          `Session ${sessionId} was not found`,
          404,
        );
      }
      this.roots.addRoot(detail.info?.cwd ?? process.cwd());
      return this.runtimeFactory.create({
        requestedSessionId: sessionId,
        sessionFile: detail.filePath,
        cwd: detail.info?.cwd ?? process.cwd(),
      });
    });
  }

  private runInBackground(
    runtime: AgentRuntime,
    command: AgentCommand,
  ): void {
    void runtime.execute(command).catch((error) => {
      console.error(`Agent command ${command.type} failed`, error);
    });
  }
}
