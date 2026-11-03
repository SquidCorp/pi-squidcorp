export function buildValidatePrompt(jsonPath: string, scriptsDir: string): string {
	return `You are validating a Pi overlay recipe catalog.

File to edit (only this file): ${jsonPath}
Optional scripts directory (read-only): ${scriptsDir}

Do this:
1. Read ${jsonPath}.
2. For each recipe that has a cmd, read any referenced script: files under ${scriptsDir}.
3. Decide whether running that cmd in this Pi session would occupy the TUI until the process exits or is cancelled (dev servers, watchers, REPLs, \`just run-dev\`, \`pnpm dev\`, etc.). Finite jobs (lint, test, fmt, build, one-shot scripts) are not blocking.
4. Do not execute any cmd or script.
5. Write \`blocking: true\` only on recipes you classified as blocking. Do not add \`blocking: false\`. Do not remove name, description, cmd, or prompt. Do not add or delete recipes.
6. If you mark blocking: true, the recipe MUST already have a prompt. If it does not, do not set blocking; report that the user must add a prompt.

After writing, list which recipes you marked blocking and which you left unchanged.`;
}
