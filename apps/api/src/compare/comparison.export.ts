import type { ComparisonItemResult, ComparisonRecord } from "./comparison.service";

/** CSV 单元格转义：含逗号/引号/换行时用双引号包裹并双写内部引号。 */
const csvCell = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

const durationText = (result: ComparisonItemResult): string =>
  result.durationMs === null ? "" : (result.durationMs / 1000).toFixed(1);

const tokensText = (result: ComparisonItemResult): string =>
  result.totalTokens === null ? "" : String(result.totalTokens);

/** 对比批次 → CSV（RFC 4180；表头 + 每列一个 Agent）。 */
export const comparisonToCsv = (
  record: ComparisonRecord,
  results: ComparisonItemResult[],
): string => {
  const header = ["agentName", "runId", "status", "durationSeconds", "tokens", "error", "output"]
    .map(csvCell)
    .join(",");
  const rows = results.map((result) =>
    [
      result.agentName,
      result.runId,
      result.status,
      durationText(result),
      tokensText(result),
      result.error ?? "",
      result.text,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header, ...rows].join("\r\n") + "\r\n";
};

/** 对比批次 → Markdown 报告（任务标题 + 结果表格 + 每列输出折叠段）。 */
export const comparisonToMarkdown = (
  record: ComparisonRecord,
  results: ComparisonItemResult[],
): string => {
  const lines: string[] = [
    `# Agent Comparison: ${record.task.replace(/\r?\n/g, " ")}`,
    "",
    `- Created: ${record.createdAt}`,
    `- Agents: ${results.map((result) => result.agentName).join(", ")}`,
    "",
    "## Results",
    "",
    "| Agent | Status | Duration | Tokens | Error |",
    "| ----- | ------ | -------- | ------ | ----- |",
  ];
  for (const result of results) {
    lines.push(
      `| ${result.agentName} | ${result.status} | ${
        result.durationMs === null ? "—" : `${(result.durationMs / 1000).toFixed(1)}s`
      } | ${result.totalTokens === null ? "—" : result.totalTokens} | ${result.error ?? "—"} |`,
    );
  }
  lines.push("", "## Outputs", "");
  for (const result of results) {
    lines.push(`### ${result.agentName}`, "", "```text", result.text || "（无输出）", "```", "");
  }
  return lines.join("\n");
};
