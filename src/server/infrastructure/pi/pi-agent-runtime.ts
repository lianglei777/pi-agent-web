import {
  createAgentSession,
  SessionManager,
  type AgentSession,
  type AgentSessionEvent,
} from "@earendil-works/pi-coding-agent";
import type { AgentCommand, ImageInput } from "@/server/domain/agent-command";
import { AppError } from "@/server/domain/app-error";
import type { AgentEvent } from "@/server/domain/agent-event";
import type { AgentRuntimeState } from "@/server/domain/agent-state";
import type {
  AgentRuntime,
  AgentRuntimeFactory,
  CreateRuntimeInput,
} from "@/server/ports/agent-runtime";
import { mapPiMessage } from "./message-mapper";

export class PiAgentRuntimeFactory implements AgentRuntimeFactory {
  async create(input: CreateRuntimeInput): Promise<AgentRuntime> {
    const manager = input.sessionFile
      ? SessionManager.open(input.sessionFile)
      : SessionManager.create(input.cwd);
    if (input.requestedSessionId && !input.sessionFile) {
      manager.newSession({ id: input.requestedSessionId });
    }
    const { session } = await createAgentSession({
      cwd: input.cwd,
      sessionManager: manager,
      tools: input.toolNames,
      noTools: input.toolNames?.length === 0 ? "all" : undefined,
    });
    return new PiAgentRuntime(session);
  }
}

export class PiAgentRuntime implements AgentRuntime {
  private alive = true;

  constructor(private readonly session: AgentSession) {}

  get sessionId(): string {
    return this.session.sessionId;
  }

  get sessionFile(): string {
    return this.session.sessionFile ?? "";
  }

  isAlive(): boolean {
    return this.alive;
  }

  async execute<T = unknown>(command: AgentCommand): Promise<T> {
    this.assertAlive();

    switch (command.type) {
      case "prompt":
        await this.session.prompt(command.message, {
          images: mapImages(command.images),
        });
        return undefined as T;
      case "abort":
        await this.session.abort();
        return undefined as T;
      case "get_state":
        return (await this.getState()) as T;
      case "set_model": {
        const model = this.session.modelRegistry.find(
          command.provider,
          command.modelId,
        );
        if (!model) {
          throw new AppError(
            "MODEL_NOT_FOUND",
            `Model ${command.provider}/${command.modelId} was not found`,
            404,
          );
        }
        await this.session.setModel(model);
        return undefined as T;
      }
      case "fork": {
        const sessionFile =
          this.session.sessionManager.createBranchedSession(command.entryId);
        if (!sessionFile) {
          throw new AppError(
            "SESSION_NOT_FOUND",
            `Entry ${command.entryId} could not be forked`,
            404,
          );
        }
        const manager = SessionManager.open(sessionFile);
        return {
          sessionId: manager.getSessionId(),
          sessionFile,
        } as T;
      }
      case "navigate_tree":
        return (await this.session.navigateTree(command.targetId)) as T;
      case "set_thinking_level":
        if (command.level !== "auto") {
          this.session.setThinkingLevel(command.level);
        }
        return undefined as T;
      case "compact":
        return (await this.session.compact(command.customInstructions)) as T;
      case "set_auto_compaction":
        this.session.setAutoCompactionEnabled(command.enabled);
        return undefined as T;
      case "steer":
        await this.session.steer(command.message, mapImages(command.images));
        return undefined as T;
      case "follow_up":
        await this.session.followUp(command.message, mapImages(command.images));
        return undefined as T;
      case "get_tools":
        return {
          active: this.session.getActiveToolNames(),
          available: this.session.getAllTools(),
        } as T;
      case "set_tools":
        this.session.setActiveToolsByName(command.toolNames);
        return undefined as T;
      case "abort_compaction":
        this.session.abortCompaction();
        return undefined as T;
      case "set_auto_retry":
        this.session.setAutoRetryEnabled(command.enabled);
        return undefined as T;
      default:
        throw new AppError(
          "UNSUPPORTED_COMMAND",
          "Unsupported agent command",
          400,
        );
    }
  }

  async getState(): Promise<AgentRuntimeState> {
    const usage = this.session.getContextUsage();
    return {
      sessionId: this.sessionId,
      sessionFile: this.sessionFile,
      isStreaming: this.session.isStreaming,
      isCompacting: this.session.isCompacting,
      autoCompactionEnabled: this.session.autoCompactionEnabled,
      autoRetryEnabled: this.session.autoRetryEnabled,
      model: this.session.model
        ? {
            id: this.session.model.id,
            provider: this.session.model.provider,
          }
        : undefined,
      contextUsage: usage
        ? {
            percent: usage.percent,
            contextWindow: usage.contextWindow,
            tokens: usage.tokens,
          }
        : null,
      systemPrompt: this.session.systemPrompt,
      thinkingLevel: this.session.thinkingLevel,
    };
  }

  subscribe(listener: (event: AgentEvent) => void): () => void {
    this.assertAlive();
    return this.session.subscribe((event) => {
      const mapped = mapEvent(event);
      if (mapped) listener(mapped);
    });
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.session.dispose();
  }

  private assertAlive(): void {
    if (!this.alive) {
      throw new AppError(
        "INTERNAL_ERROR",
        `Runtime ${this.sessionId} has been destroyed`,
        409,
      );
    }
  }
}

function mapImages(images?: ImageInput[]) {
  return images?.map((image) => ({
    type: "image" as const,
    data: image.data,
    mimeType: image.mimeType,
  }));
}

export function mapEvent(event: AgentSessionEvent): AgentEvent | null {
  switch (event.type) {
    case "agent_start":
      return { type: "agent_start" };
    case "agent_end":
      return { type: "agent_end" };
    case "message_start": {
      const message = mapPiMessage(event.message);
      return message.role === "assistant"
        ? { type: "message_start", message }
        : null;
    }
    case "message_update": {
      const message = mapPiMessage(event.message);
      return message.role === "assistant"
        ? { type: "message_update", message }
        : null;
    }
    case "message_end":
      return { type: "message_end", message: mapPiMessage(event.message) };
    case "tool_execution_start":
      return {
        type: "tool_execution_start",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
      };
    case "tool_execution_end":
      return {
        type: "tool_execution_end",
        toolCallId: event.toolCallId,
        isError: event.isError,
      };
    case "auto_retry_start":
      return {
        type: "retry_start",
        attempt: event.attempt,
        maxAttempts: event.maxAttempts,
        errorMessage: event.errorMessage,
      };
    case "auto_retry_end":
      return { type: "retry_end" };
    case "compaction_start":
      return { type: "compaction_start" };
    case "compaction_end":
      return {
        type: "compaction_end",
        aborted: event.aborted,
        errorMessage: event.errorMessage,
      };
    default:
      return null;
  }
}

