import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useEventStore } from "#/stores/use-event-store";
import { useAgentState } from "#/hooks/use-agent-state";
import { AgentState } from "#/types/agent-state";

vi.mock("#/hooks/use-agent-state");

const runCommand = vi.fn();

vi.mock("#/hooks/query/use-active-conversation", () => ({
  useActiveConversation: () => ({
    data: {
      id: "conversation-1",
      conversation_url: "http://localhost:8001/api/conversations/conversation-1",
      session_api_key: "session-key",
      workspace: { working_dir: "/workspace/project" },
    },
  }),
}));

vi.mock("#/hooks/use-runtime-is-ready", () => ({
  useRuntimeIsReady: () => true,
}));

vi.mock("#/hooks/use-bash-command-runner", () => ({
  useBashCommandRunner: () => runCommand,
}));

const mockTerminalInstance = {
  open: vi.fn(),
  write: vi.fn(),
  writeln: vi.fn(),
  dispose: vi.fn(),
  loadAddon: vi.fn(),
  options: {},
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

describe("Terminal command input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runCommand.mockReset();
    window.sessionStorage.clear();
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
      return { observe: vi.fn(), disconnect: vi.fn() };
    }) as unknown as typeof ResizeObserver;
  });

  it("runs a command typed into the input row", async () => {
    runCommand.mockResolvedValue({
      exit_code: 0,
      stdout: "hello from input",
      stderr: "",
    });

    renderWithProviders(<Terminal />);

    fireEvent.change(screen.getByLabelText("TERMINAL$COMMAND_INPUT"), {
      target: { value: "echo hello" },
    });
    fireEvent.submit(screen.getByLabelText("TERMINAL$COMMAND_INPUT"));

    await waitFor(() => expect(runCommand).toHaveBeenCalledTimes(1));
    expect(runCommand.mock.calls[0][0]).toBe("echo hello");
  });

  it("renders the typed command and its output in the terminal", async () => {
    runCommand.mockResolvedValue({
      exit_code: 0,
      stdout: "hello from input",
      stderr: "",
    });

    renderWithProviders(<Terminal />);

    fireEvent.change(screen.getByLabelText("TERMINAL$COMMAND_INPUT"), {
      target: { value: "echo hello" },
    });
    fireEvent.submit(screen.getByLabelText("TERMINAL$COMMAND_INPUT"));

    await waitFor(() =>
      expect(mockTerminalInstance.writeln).toHaveBeenCalledWith(
        "hello from input",
      ),
    );
  });
});
