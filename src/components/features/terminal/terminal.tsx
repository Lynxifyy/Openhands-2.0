import React from "react";
import { useTranslation } from "react-i18next";
import { useTerminal, useTerminalTranscript } from "#/hooks/use-terminal";
import { useTerminalCommands } from "#/hooks/use-terminal-commands";
import "@xterm/xterm/css/xterm.css";
import { RUNTIME_INACTIVE_STATES } from "#/types/agent-state";
import { cn } from "#/utils/utils";
import { WaitingForRuntimeMessage } from "../chat/waiting-for-runtime-message";
import { useAgentState } from "#/hooks/use-agent-state";
import { EmptyTerminalMessage } from "./empty-terminal-message";
import { I18nKey } from "#/i18n/declaration";
import {
  formControlBorderClassName,
  formControlHeightClassName,
  formControlRadiusClassName,
  formControlSurfaceClassName,
  formControlTransitionClassName,
} from "#/utils/form-control-classes";

function Terminal() {
  const { t } = useTranslation("openhands");
  const { curAgentState } = useAgentState();
  const {
    commands: typedCommands,
    run,
    isRunning,
    canRun,
  } = useTerminalCommands();

  const transcript = useTerminalTranscript(typedCommands);
  const hasCommands = transcript.length > 0;

  const isRuntimeInactive = RUNTIME_INACTIVE_STATES.includes(curAgentState);
  const hideTerminalSurface = isRuntimeInactive || !hasCommands;

  const ref = useTerminal(transcript);
  const [draft, setDraft] = React.useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    run(draft);
    setDraft("");
  };

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

      {!isRuntimeInactive && (
        <form
          onSubmit={submit}
          className="flex shrink-0 items-center gap-2 border-t border-border p-2"
        >
          <span aria-hidden className="pl-1 font-mono text-sm text-muted">
            $
          </span>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!canRun}
            aria-label={t(I18nKey.TERMINAL$COMMAND_INPUT)}
            placeholder={t(I18nKey.TERMINAL$COMMAND_PLACEHOLDER)}
            className={cn(
              "min-w-0 flex-1 px-2 font-mono text-sm text-content",
              formControlHeightClassName,
              formControlRadiusClassName,
              formControlBorderClassName,
              formControlSurfaceClassName,
              formControlTransitionClassName,
              "disabled:opacity-50",
            )}
          />
          <button
            type="submit"
            disabled={!canRun || !draft.trim()}
            className={cn(
              "shrink-0 px-3 text-sm",
              formControlHeightClassName,
              formControlRadiusClassName,
              formControlBorderClassName,
              formControlSurfaceClassName,
              formControlTransitionClassName,
              "disabled:opacity-50",
            )}
          >
            {isRunning ? t(I18nKey.TERMINAL$RUNNING) : t(I18nKey.BUTTON$SEND)}
          </button>
        </form>
      )}
    </div>
  );
}

export default Terminal;
