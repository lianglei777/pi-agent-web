import { AgentService } from "@/server/application/agent-service";
import { AuthService } from "@/server/application/auth-service";
import { FileService } from "@/server/application/file-service";
import { ModelService } from "@/server/application/model-service";
import { SessionService } from "@/server/application/session-service";
import { SkillService } from "@/server/application/skill-service";
import { NodeWorkspaceFileService } from "@/server/infrastructure/filesystem/node-file-system";
import { InMemoryWorkspaceRoots } from "@/server/infrastructure/filesystem/workspace-roots";
import { PiAgentRuntimeFactory } from "@/server/infrastructure/pi/pi-agent-runtime";
import { PiCredentialProvider } from "@/server/infrastructure/pi/pi-credential-provider";
import { PiModelProvider } from "@/server/infrastructure/pi/pi-model-provider";
import { PiSessionRepository } from "@/server/infrastructure/pi/pi-session-repository";
import { PiSkillProvider } from "@/server/infrastructure/pi/pi-skill-provider";
import { NodeProcessRunner } from "@/server/infrastructure/process/node-process-runner";
import { InMemoryAgentRegistry } from "@/server/infrastructure/runtime/in-memory-agent-registry";
import { PendingInputRegistry } from "@/server/infrastructure/runtime/pending-input-registry";

function createContainer() {
  const sessions = new PiSessionRepository();
  const runtimes = new InMemoryAgentRegistry();
  const runtimeFactory = new PiAgentRuntimeFactory();
  const roots = new InMemoryWorkspaceRoots();
  const credentials = new PiCredentialProvider();
  const models = new PiModelProvider();
  const pendingInputs = new PendingInputRegistry();
  const fileSystem = new NodeWorkspaceFileService();
  const processes = new NodeProcessRunner();
  const skills = new PiSkillProvider(processes);

  return {
    roots,
    sessionService: new SessionService(sessions, runtimes),
    agentService: new AgentService(
      sessions,
      runtimes,
      runtimeFactory,
      roots,
    ),
    modelService: new ModelService(models),
    authService: new AuthService(credentials, pendingInputs),
    fileService: new FileService(fileSystem, roots),
    skillService: new SkillService(skills),
  };
}

export type AppContainer = ReturnType<typeof createContainer>;

const globalContainer = globalThis as typeof globalThis & {
  __piAgentContainer?: AppContainer;
};

export const container =
  globalContainer.__piAgentContainer ?? createContainer();

if (process.env.NODE_ENV !== "production") {
  globalContainer.__piAgentContainer = container;
}

