import React from "react";
import { useTerminal } from "#/hooks/use-terminal";
import "@xterm/xterm/css/xterm.css";
import { RUNTIME_INACTIVE_STATES } from "#/types/agent-state";
import { cn } from "#/utils/utils";
import { WaitingForRuntimeMessage } from "../chat/waiting-for-runtime-message";
import { useAgentState } from "#/hooks/use-agent-state";
import { useEventStore } from "#/stores/use-event-store";
import { deriveTerminalCommands } from "#/utils/terminal-events";
import { EmptyTerminalMessage } from "./empty-terminal-message";

function Terminal() {
  const { curAgentState } = useAgentState();
  const events = useEventStore((state) => state.events);
  const commands = React.useMemo(
    () => deriveTerminalCommands(events),
    [events],
  );
  const hasCommands = commands.length > 0;

  const isRuntimeInactive = RUNTIME_INACTIVE_STATES.includes(curAgentState);
  const hideTerminalSurface = isRuntimeInactive || !hasCommands;

  const ref = useTerminal();

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {isRuntimeInactive && <WaitingForRuntimeMessage className="pt-16" />}

      {!isRuntimeInactive && !hasCommands && <EmptyTerminalMessage />}

      <div
        className={cn(
          "flex-1 min-h-0 p-4",
          hideTerminalSurface &&
            "pointer-events-none absolute inset-0 h-0 w-0 overflow-hidden p-0 opacity-0",
        )}
      >
        <div ref={ref} className="h-full w-full" />
      </div>
    </div>
  );
}

export default Terminal;
