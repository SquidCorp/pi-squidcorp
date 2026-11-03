import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { executeRecipe } from "./execute.ts";
import { parseJustDump, publicJustRecipes } from "./just.ts";
import { mergeJustRecipes } from "./merge.ts";
import { overlayJsonPath, overlayScriptsDir } from "./paths.ts";
import { type Recipe } from "./schema.ts";
import { isScriptCmd, resolveCmd } from "./scripts.ts";
import { loadCatalog, saveCatalog } from "./store.ts";
import { buildValidatePrompt } from "./validate-prompt.ts";

export default function piJustExtension(pi: ExtensionAPI) {
	const recipesByName = new Map<string, Recipe>();
	const registered = new Set<string>();
	let pendingReload = false;

	const registerRecipeCommand = (recipe: Recipe) => {
		const commandName = `just:${recipe.name}`;
		if (registered.has(commandName)) return;
		registered.add(commandName);
		pi.registerCommand(commandName, {
			description: recipe.description,
			handler: async (args, ctx) => {
				if (!requireTrusted(ctx)) return;
				const current = recipesByName.get(recipe.name);
				if (!current) {
					ctx.ui.notify(`Recipe "${recipe.name}" is no longer in justfile.json`, "warning");
					return;
				}
				await executeRecipe(pi, current, args, ctx);
			},
		});
	};

	const syncRecipes = (recipes: Recipe[]) => {
		recipesByName.clear();
		for (const recipe of recipes) {
			recipesByName.set(recipe.name, recipe);
			registerRecipeCommand(recipe);
		}
	};

	const reloadFromDisk = async (ctx: ExtensionContext) => {
		const loaded = await loadCatalog(ctx.cwd);
		if (loaded.issues.length > 0) {
			ctx.ui.notify(formatIssues(loaded.path, loaded.issues), "error");
			syncRecipes(loaded.recipes);
			return loaded;
		}
		syncRecipes(loaded.recipes);
		return loaded;
	};

	pi.registerCommand("just", {
		description: "List overlay recipes from .pi/just/justfile.json",
		getArgumentCompletions: (prefix) => completeRecipeNames(recipesByName, prefix),
		handler: async (_args, ctx) => {
			if (!requireTrusted(ctx)) return;
			const loaded = await reloadFromDisk(ctx);
			if (loaded.missing) {
				ctx.ui.notify(`No overlay catalog at ${loaded.path}. Use /just:merge or create it.`, "info");
				return;
			}
			if (loaded.recipes.length === 0) {
				ctx.ui.notify("justfile.json has no recipes", "info");
				return;
			}
			ctx.ui.notify(formatRecipeList(loaded.recipes), "info");
		},
	});

	pi.registerCommand("just:validate", {
		description: "Validate overlay recipes and classify blocking commands",
		handler: async (_args, ctx) => {
			if (!requireTrusted(ctx)) return;
			const loaded = await reloadFromDisk(ctx);
			if (loaded.missing) {
				ctx.ui.notify(`Nothing to validate: ${loaded.path} does not exist`, "warning");
				return;
			}
			if (loaded.issues.length > 0) {
				return;
			}

			const scriptIssues = collectScriptIssues(ctx.cwd, loaded.recipes);
			if (scriptIssues.length > 0) {
				ctx.ui.notify(scriptIssues.join("\n"), "error");
				return;
			}

			if (!ctx.isIdle()) {
				ctx.ui.notify("Agent is busy; retry /just:validate when idle", "warning");
				return;
			}

			pendingReload = true;
			ctx.ui.notify("Schema ok. Starting agent to classify blocking recipes…", "info");
			pi.sendUserMessage(buildValidatePrompt(loaded.path, overlayScriptsDir(ctx.cwd)));
		},
	});

	pi.registerCommand("just:merge", {
		description: "Import public recipes from the repo justfile into justfile.json",
		handler: async (_args, ctx) => {
			if (!requireTrusted(ctx)) return;
			const loaded = await loadCatalog(ctx.cwd);
			if (loaded.issues.length > 0 && !loaded.missing) {
				ctx.ui.notify(formatIssues(loaded.path, loaded.issues), "error");
				return;
			}

			const dump = await pi.exec("just", ["--dump", "--dump-format", "json"], {
				cwd: ctx.cwd,
				signal: ctx.signal,
			});
			if (dump.code !== 0) {
				ctx.ui.notify(dump.stderr.trim() || "just --dump failed (is just installed?)", "error");
				return;
			}

			let justRecipes;
			try {
				const parsed: unknown = JSON.parse(dump.stdout);
				justRecipes = publicJustRecipes(parseJustDump(parsed));
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(message, "error");
				return;
			}

			const merged = mergeJustRecipes(loaded.recipes, justRecipes);
			await saveCatalog(ctx.cwd, merged.recipes);
			syncRecipes(merged.recipes);
			ctx.ui.notify(formatMergeReport(overlayJsonPath(ctx.cwd), merged), "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.isProjectTrusted()) {
			syncRecipes([]);
			return;
		}
		await reloadFromDisk(ctx);
	});

	pi.on("agent_settled", async (_event, ctx) => {
		if (!pendingReload || !ctx.isProjectTrusted()) return;
		pendingReload = false;
		await reloadFromDisk(ctx);
	});

	pi.on("before_agent_start", async (event) => {
		if (recipesByName.size === 0) return;
		const lines = [...recipesByName.values()].map((recipe) => {
			const flags = recipeFlags(recipe).join(", ");
			return `- /just:${recipe.name} (${flags}): ${recipe.description}`;
		});
		event.systemPromptOptions.sections.just = [
			"Project overlay recipes from .pi/just/justfile.json.",
			"The user can run them with /just:<name>. Repo justfile recipes are still available via bash as `just <recipe>`.",
			...lines,
		].join("\n");
	});
}

function requireTrusted(ctx: ExtensionCommandContext): boolean {
	if (ctx.isProjectTrusted()) return true;
	ctx.ui.notify("pi-just only reads .pi/just after the project is trusted", "warning");
	return false;
}

function completeRecipeNames(recipesByName: Map<string, Recipe>, prefix: string) {
	const items = [...recipesByName.values()]
		.filter((recipe) => recipe.name.startsWith(prefix))
		.map((recipe) => ({
			value: recipe.name,
			label: recipe.name,
			description: recipe.description,
		}));
	return items.length > 0 ? items : null;
}

function collectScriptIssues(cwd: string, recipes: Recipe[]): string[] {
	const issues: string[] = [];
	for (const recipe of recipes) {
		if (!recipe.cmd || !isScriptCmd(recipe.cmd)) continue;
		const resolved = resolveCmd(cwd, recipe.cmd);
		if (resolved.kind === "error") issues.push(`${recipe.name}: ${resolved.message}`);
	}
	return issues;
}

function formatIssues(path: string, issues: { path: string; message: string }[]): string {
	const lines = issues.map((issue) => `${issue.path}: ${issue.message}`);
	return `${path}\n${lines.join("\n")}`;
}

function formatRecipeList(recipes: Recipe[]): string {
	return recipes
		.map((recipe) => `/just:${recipe.name}  [${recipeFlags(recipe).join("+")}]  ${recipe.description}`)
		.join("\n");
}

function recipeFlags(recipe: Recipe): string[] {
	const flags: string[] = [];
	if (recipe.blocking) flags.push("blocking");
	if (recipe.cmd) flags.push("cmd");
	if (recipe.prompt) flags.push("prompt");
	return flags.length > 0 ? flags : ["empty"];
}

function formatMergeReport(
	path: string,
	merged: {
		added: string[];
		duplicates: string[];
		skippedReserved: string[];
		skippedInvalid: string[];
	},
): string {
	const lines = [`Merged into ${path}`, `added: ${merged.added.length ? merged.added.join(", ") : "(none)"}`];
	if (merged.duplicates.length > 0) {
		lines.push(`duplicates (not overwritten): ${merged.duplicates.join(", ")}`);
	}
	if (merged.skippedReserved.length > 0) {
		lines.push(`skipped reserved: ${merged.skippedReserved.join(", ")}`);
	}
	if (merged.skippedInvalid.length > 0) {
		lines.push(`skipped invalid names: ${merged.skippedInvalid.join(", ")}`);
	}
	return lines.join("\n");
}
