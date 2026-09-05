export interface CommandItem {
  id: string;
  category: "页面" | "Workflow" | "Run";
  label: string;
  hint?: string;
  keywords: string;
  run: () => void;
}

/**
 * 命令面板过滤(DesignGuidelines §42):
 * 关键词对 label/hint/keywords 做不区分大小写的子串匹配,保持原顺序。
 */
export const filterCommands = (commands: CommandItem[], query: string): CommandItem[] => {
  const q = query.trim().toLowerCase();
  if (q === "") return commands;
  return commands.filter(
    (command) =>
      command.label.toLowerCase().includes(q) ||
      command.hint?.toLowerCase().includes(q) ||
      command.keywords.includes(q),
  );
};
