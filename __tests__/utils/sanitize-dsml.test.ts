import { describe, expect, it } from "vitest";
import { containsDsml, sanitizeDsml } from "#/utils/sanitize-dsml";

const D = "\uff5cDSML\uff5c";

describe("sanitizeDsml", () => {
  it("leaves text without markup untouched", () => {
    const text = "Here is the answer.\n\nNo tool calls here.";

    expect(sanitizeDsml(text)).toBe(text);
    expect(containsDsml(text)).toBe(false);
  });

  it("drops a complete tool_calls block and keeps the surrounding prose", () => {
    const text = [
      "Let me read that file.",
      `<${D}tool_calls>`,
      `<${D}invoke name="read_file">`,
      `<${D}parameter name="path" string="true">README.md</${D}parameter>`,
      `</${D}invoke>`,
      `</${D}tool_calls>`,
    ].join("\n");

    const sanitized = sanitizeDsml(text);

    expect(containsDsml(sanitized)).toBe(false);
    expect(sanitized).toContain("Let me read that file.");
    expect(sanitized).not.toContain("README.md");
  });

  it("drops an orphaned invoke without leaving its parameter value behind", () => {
    // DeepSeek V4 Flash emits these when the tool_calls wrapper is lost; the
    // value must not survive as visible prose.
    const text = [
      "Working on it.",
      `<${D}invoke name="run_command">`,
      `<${D}parameter name="command" string="true">rm -rf /tmp/scratch</${D}parameter>`,
      `</${D}invoke>`,
    ].join("\n");

    const sanitized = sanitizeDsml(text);

    expect(sanitized).toContain("Working on it.");
    expect(sanitized).not.toContain("rm -rf /tmp/scratch");
    expect(containsDsml(sanitized)).toBe(false);
  });

  it("removes unmatched fragments such as a stray closing tag", () => {
    const sanitized = sanitizeDsml(`Done.</${D}invoke>`);

    expect(sanitized).toBe("Done.");
  });

  it("removes markup when a real tool call is also present", () => {
    const text = `Text before.</${D}tool_calls>`;

    expect(sanitizeDsml(text)).toBe("Text before.");
  });
});
