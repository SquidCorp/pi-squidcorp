import { join } from "node:path";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";

export function overlayDir(cwd: string): string {
	return join(cwd, CONFIG_DIR_NAME, "just");
}

export function overlayJsonPath(cwd: string): string {
	return join(overlayDir(cwd), "justfile.json");
}

export function overlayScriptsDir(cwd: string): string {
	return join(overlayDir(cwd), "scripts");
}
