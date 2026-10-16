import { screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useEventStore, type OHEvent } from "#/stores/use-event-store";
import { useAgentState } from "#/hooks/use-agent-state";
import { AgentState } from "#/types/agent-state";

vi.mock("#/hooks/use-agent-state");

const mockTerminalInstance = {
  open: vi.fn(),
  write: vi.fn(),
  writeln: vi.fn(),
  dispose: vi.fn(),
  loadAddon: vi.fn(),
};

vi.mock("@xterm/xterm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@xterm/xterm")>()),
  Terminal: vi.fn(function MockTerminal() {
    return mockTerminalInstance;
  }),
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn(function MockFitAddon() {
    return { fit: vi.fn() };
  }),
}));

import { renderWithProviders } from "test-utils";
import Terminal from "#/components/features/terminal/terminal";

const bashObservation: OHEvent = {
  id: "obs-1",
  timestamp: "2026-01-01T00:00:00Z",
  source: "environment",
  action_id: "act-1",
  tool_name: "execute_bash",
  tool_call_id: "call-1",
  observation: {
    kind: "ExecuteBashObservation",
    content: [{ type: "text", text: "hello" }],
    command: "run",
    exit_code: 0,
    error: false,
    timeout: false,
    metadata: { exit_code: 0 },
  },
} as unknown as OHEvent;

describe("Terminal empty state", () => {
  beforeEach(() => {
    useEventStore.setState({
      events: [],
      eventIds: new Set(),
      uiEvents: [],
      loadedConversationId: null,
    });
    vi.mocked(useAgentState).mockReturnValue({
      curAgentState: AgentState.RUNNING,
    });
    global.ResizeObserver = vi.fn(function MockResizeObserver() {
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };
    }) as unknown as typeof ResizeObserver;
  });

  it("shows the empty state when runtime is active and there is no output", () => {
    renderWithProviders(<Terminal />);

    expect(screen.getByText("TERMINAL$NO_OUTPUT")).toBeInTheDocument();
  });

  it("hides the empty state when terminal commands exist", () => {
    useEventStore.setState({ events: [bashObservation] });

    renderWithProviders(<Terminal />);

    expect(screen.queryByText("TERMINAL$NO_OUTPUT")).not.toBeInTheDocument();
  });

  it("shows the runtime waiting state instead of the empty state when inactive", () => {
    vi.mocked(useAgentState).mockReturnValue({
      curAgentState: AgentState.LOADING,
    });

    renderWithProviders(<Terminal />);

    expect(screen.queryByText("TERMINAL$NO_OUTPUT")).not.toBeInTheDocument();
    expect(screen.getByTestId("runtime-waiting")).toBeInTheDocument();
  });
});
