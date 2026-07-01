import { describe, expectTypeOf, it } from "vitest";
import type {
  AgentCommand,
  AgentCommandResult,
  AgentRuntimeState,
} from "./agent";
import type { SuccessResponse } from "./common";
import type { FileEntry, ListFilesResponse } from "./files";
import type { ListProjectsResponse, Project } from "./projects";
import type { ListSessionsResponse, SessionInfo } from "./sessions";
import type { HomeResponse } from "./system";

describe("shared API contracts", () => {
  it("covers Agent command and state drift", () => {
    expectTypeOf<
      Extract<AgentCommand, { type: "set_auto_compaction" }>
    >().toEqualTypeOf<{ type: "set_auto_compaction"; enabled: boolean }>();
    expectTypeOf<
      Extract<AgentCommand, { type: "set_auto_retry" }>
    >().toEqualTypeOf<{ type: "set_auto_retry"; enabled: boolean }>();
    expectTypeOf<AgentRuntimeState>().toHaveProperty("sessionFile");
    expectTypeOf<AgentRuntimeState>().toHaveProperty(
      "autoCompactionEnabled",
    );
    expectTypeOf<AgentRuntimeState>().toHaveProperty("autoRetryEnabled");
    expectTypeOf<AgentCommandResult<{ type: "get_state" }>>().toEqualTypeOf<AgentRuntimeState>();
    expectTypeOf<AgentCommandResult<{ type: "abort" }>>().toEqualTypeOf<SuccessResponse>();
  });

  it("covers workspace API responses", () => {
    expectTypeOf<HomeResponse>().toEqualTypeOf<{ home: string }>();
    expectTypeOf<ListProjectsResponse>().toEqualTypeOf<Project[]>();
    expectTypeOf<ListSessionsResponse>().toEqualTypeOf<SessionInfo[]>();
    expectTypeOf<ListFilesResponse>().toEqualTypeOf<FileEntry[]>();
  });
});
