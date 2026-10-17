import { beforeAll, describe, expect, it, vi, afterEach } from "vitest";
import { useTerminal, useTerminalTranscript } from "#/hooks/use-terminal";
import { useEventStore, type OHEvent } from "#/stores/use-event-store";
import { renderWithProviders } from "../../test-utils";

// Mock useActiveConversation
vi.mock("#/hooks/query/use-active-conversation", () => ({
  useActiveConversation: () => ({
    data: {
      id: "test-conversation-id",
    },
    isFetched: true,
  }),
}));

// Mock useConversationWebSocket
vi.mock("#/contexts/conversation-websocket-context", () => ({
  useConversationWebSocket: () => null,
}));

function TestTerminalComponent() {
  // Mirrors the component: the transcript is derived once and handed to the
  // terminal, so the hook renders exactly what the tab will show.
  const ref = useTerminal(useTerminalTranscript());
  return <div ref={ref} />;
}

const makeBashAction = (id: string, command: string): OHEvent =>
  ({
    id,
    timestamp: "2026-01-01T00:00:00Z",
    source: "agent",
    thought: [],
    thinking_blocks: [],
    action: {
      kind: "ExecuteBashAction",
      command,
      is_input: false,
      timeout: null,
      reset: false,
    },
    tool_name: "execute_bash",
    tool_call_id: `call-${id}`,
    llm_response_id: `resp-${id}`,
    security_risk: "UNKNOWN",
  }) as unknown as OHEvent;

const makeBashObservation = (
  id: string,
  text: string,
  { exitCode = 0, timeout = false } = {},
): OHEvent =>
  ({
    id,
    timestamp: "2026-01-01T00:00:00Z",
    source: "environment",
    action_id: `act-${id}`,
    tool_name: "execute_bash",
    tool_call_id: `call-${id}`,
    observation: {
      kind: "ExecuteBashObservation",
      content: [{ type: "text", text }],
      command: "run",
      exit_code: exitCode,
      error: false,
      timeout,
      metadata: { exit_code: exitCode },
    },
  }) as unknown as OHEvent;

// Terminal is read-only - no longer tests user input functionality
const mockTerminal = vi.hoisted(() => ({
  loadAddon: vi.fn(),
  open: vi.fn(),
  write: vi.fn(),
  writeln: vi.fn(),
  dispose: vi.fn(),
  element: document.createElement("div"),
}));

const mockFitAddon = vi.hoisted(() => ({
  fit: vi.fn(),
}));

// mock Terminal - use class for Vitest 4 constructor support
vi.mock("@xterm/xterm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@xterm/xterm")>()),
  Terminal: class {
    loadAddon = mockTerminal.loadAddon;

    open = mockTerminal.open;

    write = mockTerminal.write;

    writeln = mockTerminal.writeln;

    dispose = mockTerminal.dispose;

    element = mockTerminal.element;
  },
}));

// mock FitAddon
vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class {
    fit = mockFitAddon.fit;
  },
}));

describe("useTerminal", () => {
  beforeAll(() => {
    // mock ResizeObserver - use class for Vitest 4 constructor support
    window.ResizeObserver = class {
      observe = vi.fn();

      unobserve = vi.fn();

      disconnect = vi.fn();
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    vi.clearAllMocks();
    // The terminal is derived from the shared event log between tests.
    useEventStore.setState({
      events: [],
      eventIds: new Set(),
      uiEvents: [],
      loadedConversationId: null,
    });
  });

  it("should render", () => {
    renderWithProviders(<TestTerminalComponent />);
  });

  it("should render the commands in the terminal", () => {
    // Seed the event log the terminal derives its transcript from.
    useEventStore.setState({
      events: [
        makeBashAction("1", "echo hello"),
        makeBashObservation("2", "hello"),
      ],
    });

    renderWithProviders(<TestTerminalComponent />);

    expect(mockTerminal.writeln).toHaveBeenNthCalledWith(1, "echo hello");
    expect(mockTerminal.writeln).toHaveBeenNthCalledWith(2, "hello");
  });

  it("should mark a command that hit the soft timeout as still running", () => {
    useEventStore.setState({
      events: [
        makeBashAction("1", "sleep 100"),
        makeBashObservation("2", "partial output", {
          exitCode: -1,
          timeout: true,
        }),
      ],
    });

    renderWithProviders(<TestTerminalComponent />);

    expect(mockTerminal.writeln).toHaveBeenCalledWith(
      "  ⏳ TERMINAL$STILL_RUNNING",
    );
  });

  it("should not call fit() when terminal.element is null", () => {
    // Temporarily set element to null to simulate terminal not being opened
    const originalElement = mockTerminal.element;
    mockTerminal.element = null as unknown as HTMLDivElement;

    renderWithProviders(<TestTerminalComponent />);

    // fit() should not be called because terminal.element is null
    expect(mockFitAddon.fit).not.toHaveBeenCalled();

    // Restore original element
    mockTerminal.element = originalElement;
  });
});
