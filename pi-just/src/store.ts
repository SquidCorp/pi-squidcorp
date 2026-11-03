import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { overlayJsonPath } from "./paths.ts";
import { parseRecipes, serializeRecipes, type Recipe, type ValidationIssue } from "./schema.ts";

export type LoadedCatalog = {
	path: string;
	recipes: Recipe[];
	issues: ValidationIssue[];
	missing: boolean;
};

export async function loadCatalog(cwd: string): Promise<LoadedCatalog> {
	const path = overlayJsonPath(cwd);
	try {
		const raw = await readFile(path, "utf8");
		const parsed: unknown = JSON.parse(raw);
		const { recipes, issues } = parseRecipes(parsed);
		return { path, recipes, issues, missing: false };
	} catch (error) {
		if (isNotFound(error)) {
			return { path, recipes: [], issues: [], missing: true };
		}
		if (error instanceof SyntaxError) {
			return {
				path,
				recipes: [],
				issues: [{ path: "$", message: `invalid JSON: ${error.message}` }],
				missing: false,
			};
		}
		throw error;
	}
}

export async function saveCatalog(cwd: string, recipes: Recipe[]): Promise<string> {
	const path = overlayJsonPath(cwd);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, serializeRecipes(recipes), "utf8");
	return path;
}

function isNotFound(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
