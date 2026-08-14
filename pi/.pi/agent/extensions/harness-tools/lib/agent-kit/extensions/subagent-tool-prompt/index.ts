import type {
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

export default function subagentToolPrompt(pi: ExtensionAPI): void {
  pi.on(
    "before_agent_start",
    async (
      event: BeforeAgentStartEvent,
    ): Promise<BeforeAgentStartEventResult | undefined> => {
      const { systemPrompt, systemPromptOptions } = event;
      const { toolSnippets = {}, promptGuidelines = [] } = systemPromptOptions;
      const sections: string[] = [];
      const snippetLines = Object.entries(toolSnippets).map(
        ([name, snippet]) => `- ${name}: ${snippet}`,
      );
      if (snippetLines.length > 0) {
        sections.push(["## Available tools", "", ...snippetLines].join("\n"));
      }
      if (promptGuidelines.length > 0) {
        sections.push(
          [
            "## Tool usage guidelines",
            "",
            ...promptGuidelines.map((guideline) => `- ${guideline}`),
          ].join("\n"),
        );
      }
      if (sections.length === 0) return undefined;
      return { systemPrompt: `${systemPrompt}\n\n${sections.join("\n\n")}` };
    },
  );
}
