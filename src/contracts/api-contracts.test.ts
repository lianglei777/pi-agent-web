import { describe, expectTypeOf, it } from "vitest";
import type {
  AgentCommand,
  AgentCommandResult,
  AgentRuntimeState,
} from "./agent";
import type { SuccessResponse } from "./common";

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
});
