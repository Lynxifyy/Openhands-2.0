import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTerminalCommands } from "#/hooks/use-terminal-commands";

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

describe("useTerminalCommands", () => {
  beforeEach(() => {
    runCommand.mockReset();
    window.sessionStorage.clear();
  });

  it("appends the typed command and its output to the transcript", async () => {
    runCommand.mockResolvedValue({
      exit_code: 0,
      stdout: "typed output",
      stderr: "",
    });

    const { result } = renderHook(() => useTerminalCommands());

    act(() => result.current.run("echo hi"));

    await waitFor(() => expect(result.current.isRunning).toBe(false));

    expect(runCommand).toHaveBeenCalledWith(
      "echo hi",
      "/workspace/project",
      expect.any(Number),
    );
    expect(result.current.commands).toEqual([
      { content: "echo hi", type: "input" },
      { content: "typed output", type: "output" },
    ]);
  });

  it("shows the command as running until it finishes", async () => {
    let resolveCommand: (value: unknown) => void = () => {};
    runCommand.mockReturnValue(
      new Promise((resolve) => {
        resolveCommand = resolve;
      }),
    );

    const { result } = renderHook(() => useTerminalCommands());

    act(() => result.current.run("sleep 5"));

    // The command is echoed immediately and flagged as running rather than
    // appearing ignored while it executes.
    expect(result.current.isRunning).toBe(true);
    expect(result.current.commands).toEqual([
      { content: "sleep 5", type: "input" },
    ]);

    await act(async () => {
      resolveCommand({ exit_code: 0, stdout: "done", stderr: "" });
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.commands).toEqual([
      { content: "sleep 5", type: "input" },
      { content: "done", type: "output" },
    ]);
  });

  it("surfaces a failure instead of dropping it", async () => {
    runCommand.mockRejectedValue(new Error("backend unreachable"));

    const { result } = renderHook(() => useTerminalCommands());

    act(() => result.current.run("echo hi"));

    await waitFor(() =>
      expect(result.current.commands.at(-1)).toEqual({
        content: "backend unreachable",
        type: "output",
      }),
    );
  });

  it("ignores an empty command", () => {
    const { result } = renderHook(() => useTerminalCommands());

    act(() => result.current.run("   "));

    expect(runCommand).not.toHaveBeenCalled();
    expect(result.current.commands).toEqual([]);
  });

  it("restores typed commands from session storage on mount", () => {
    window.sessionStorage.setItem(
      "agent-canvas:terminal-commands:conversation-1",
      JSON.stringify([
        { content: "echo persisted", type: "input" },
        { content: "persisted", type: "output" },
      ]),
    );

    const { result } = renderHook(() => useTerminalCommands());

    expect(result.current.commands).toEqual([
      { content: "echo persisted", type: "input" },
      { content: "persisted", type: "output" },
    ]);
  });
});
