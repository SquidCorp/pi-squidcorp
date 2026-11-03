import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { hasText, type Recipe } from "./schema.ts";
import { resolveCmd } from "./scripts.ts";

export async function executeRecipe(
	pi: ExtensionAPI,
	recipe: Recipe,
	args: string,
	ctx: ExtensionCommandContext,
): Promise<void> {
	if (recipe.blocking === true) {
		handoffBlocking(pi, recipe, args, ctx);
		return;
	}
	if (hasText(recipe.cmd)) {
		await runCmdRecipe(pi, recipe, args, ctx);
		return;
	}
	if (hasText(recipe.prompt)) {
		startAgent(pi, recipe.prompt, ctx);
		return;
	}
	ctx.ui.notify(`Recipe "${recipe.name}" has neither cmd nor prompt`, "error");
}

function handoffBlocking(
	pi: ExtensionAPI,
	recipe: Recipe,
	args: string,
	ctx: ExtensionCommandContext,
): void {
	const prompt = recipe.prompt?.trim() ?? "";
	if (!prompt) {
		ctx.ui.notify(
			`"${recipe.name}" is blocking but has no prompt. Run /just:validate after adding one`,
			"error",
		);
		return;
	}

	const extra = args.trim() ? `\nExtra arguments: ${args.trim()}` : "";
	const cmdBlock = hasText(recipe.cmd)
		? `\n\nThe overlay command was not executed because blocking is true. Do not run it in a way that occupies this Pi session until cancel. Prefer a detaching script or another terminal.\n\nCommand:\n\`\`\`bash\n${recipe.cmd.trim()}\n\`\`\`${extra}`
		: extra;

	startAgent(pi, `${prompt}${cmdBlock}`, ctx);
}

async function runCmdRecipe(
	pi: ExtensionAPI,
	recipe: Recipe,
	args: string,
	ctx: ExtensionCommandContext,
): Promise<void> {
	const cmd = recipe.cmd;
	if (!cmd) return;

	const resolved = resolveCmd(ctx.cwd, cmd);
	if (resolved.kind === "error") {
		ctx.ui.notify(resolved.message, "error");
		return;
	}

	ctx.ui.notify(`Running /just:${recipe.name}…`, "info");
	const result = await runResolved(pi, resolved, args, ctx);
	const output = formatExecOutput(recipe.name, result);

	pi.sendMessage(
		{
			customType: "just-output",
			content: output,
			display: true,
			details: {
				recipe: recipe.name,
				code: result.code,
				killed: result.killed,
			},
		},
		{ triggerTurn: false },
	);

	if (result.code === 0) {
		ctx.ui.notify(`/just:${recipe.name} exited 0`, "info");
		return;
	}

	if (hasText(recipe.prompt)) {
		ctx.ui.notify(`/just:${recipe.name} failed; handing off to the agent`, "warning");
		startAgent(pi, `${recipe.prompt.trim()}\n\nCommand output:\n\`\`\`\n${output}\n\`\`\``, ctx);
		return;
	}

	ctx.ui.notify(`/just:${recipe.name} exited ${result.code}`, "error");
}

async function runResolved(
	pi: ExtensionAPI,
	resolved: Exclude<ReturnType<typeof resolveCmd>, { kind: "error" }>,
	args: string,
	ctx: ExtensionCommandContext,
) {
	const extra = splitArgs(args);
	if (resolved.kind === "script") {
		return pi.exec("bash", [resolved.path, ...extra], {
			cwd: ctx.cwd,
			signal: ctx.signal,
		});
	}

	const script = extra.length > 0 ? `${resolved.script.trimEnd()} ${extra.join(" ")}` : resolved.script;
	return pi.exec("bash", ["-c", script], {
		cwd: ctx.cwd,
		signal: ctx.signal,
	});
}

function startAgent(pi: ExtensionAPI, prompt: string, ctx: ExtensionCommandContext): void {
	if (!ctx.isIdle()) {
		ctx.ui.notify("Agent is busy; wait until it settles, then retry", "warning");
		return;
	}
	pi.sendUserMessage(prompt);
}

function formatExecOutput(
	name: string,
	result: { stdout: string; stderr: string; code: number; killed: boolean; truncated: boolean },
): string {
	const parts = [`/just:${name} exit ${result.code}`];
	if (result.killed) parts.push("(killed)");
	if (result.truncated) parts.push("(truncated)");
	const body = [result.stdout, result.stderr].filter((chunk) => chunk.trim().length > 0).join("\n");
	return body ? `${parts.join(" ")}\n${body}` : parts.join(" ");
}

function splitArgs(args: string): string[] {
	const trimmed = args.trim();
	if (!trimmed) return [];
	return trimmed.split(/\s+/);
}
