/**
 * Strip DeepSeek DSML tool-call markup from text shown in the UI.
 *
 * DeepSeek V4 / V4.1 models sometimes emit their tool call as DSML markup
 * inside the assistant message content instead of a structured tool call. The
 * agent-server recovers those calls, but the raw markup still reaches the
 * renderer whenever the recovery did not run — a conversation recorded before
 * the server-side fix, a backend running an older agent-server, or a reply the
 * server could not parse. Rendered verbatim it reads as the agent's final
 * answer, which is exactly the confusing state this removes.
 *
 * `DSML_TOKEN` is U+FF5C `DSML` U+FF5C. Keep this in step with the server-side
 * parser in `openhands/sdk/llm/utils/dsml.py`.
 */

const DSML_TOKEN = "\uff5cDSML\uff5c";

const escapeForRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const DSML = escapeForRegExp(DSML_TOKEN);

// A complete `<tool_calls>` wrapper, dropped with the invokes it contains.
const TOOL_CALLS_BLOCK = new RegExp(
  `<${DSML}tool_calls>[\\s\\S]*?</${DSML}tool_calls>`,
  "g",
);

// An `invoke`/`parameter` element whose `tool_calls` wrapper is missing.
// DeepSeek V4 Flash emits these intermittently, so the element is dropped whole
// (value included) rather than leaving the raw parameter value in the text.
const ORPHAN_ELEMENT = new RegExp(
  `<${DSML}(?:invoke|parameter)\\b[^>]*>[\\s\\S]*?</${DSML}(?:invoke|parameter)>`,
  "g",
);

// Any DSML tag left over, matched or not, so no markup reaches the user.
const DSML_FRAGMENT = new RegExp(`</?${DSML}[^>]*>`, "g");

/** True when `text` carries the DSML markup token. */
export const containsDsml = (text: string): boolean =>
  text.includes(DSML_TOKEN);

/**
 * Remove DSML markup from `text`, leaving the prose around it.
 *
 * The passes are ordered deliberately: blocks and orphaned elements are dropped
 * whole first, so a malformed block does not leave its parameter values behind,
 * then any remaining tag is removed so unmatched closing tags cannot survive.
 */
export const sanitizeDsml = (text: string): string => {
  if (!containsDsml(text)) {
    return text;
  }

  return text
    .replace(TOOL_CALLS_BLOCK, "")
    .replace(ORPHAN_ELEMENT, "")
    .replace(DSML_FRAGMENT, "");
};
