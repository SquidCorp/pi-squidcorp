import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { overlayScriptsDir } from "./paths.ts";

const SCRIPT_PREFIX = "script:";

export type ResolvedCmd =
	| { kind: "inline"; script: string }
	| { kind: "script"; path: string }
	| { kind: "error"; message: string };

export function isScriptCmd(cmd: string): boolean {
	return cmd.trimStart().startsWith(SCRIPT_PREFIX);
}

export function resolveCmd(cwd: string, cmd: string): ResolvedCmd {
	const trimmed = cmd.trim();
	if (!trimmed.startsWith(SCRIPT_PREFIX)) {
		return { kind: "inline", script: cmd };
	}

	const name = trimmed.slice(SCRIPT_PREFIX.length).trim();
	if (!name || name !== basename(name) || name === "." || name === "..") {
		return { kind: "error", message: `invalid script name "${name}"` };
	}

	const dir = overlayScriptsDir(cwd);
	const exact = join(dir, name);
	if (existsSync(exact)) return { kind: "script", path: exact };

	if (!name.endsWith(".sh")) {
		const withExt = join(dir, `${name}.sh`);
		if (existsSync(withExt)) return { kind: "script", path: withExt };
	}

	return {
		kind: "error",
		message: `script not found: ${join(dir, name)} (also tried ${name}.sh)`,
	};
}
