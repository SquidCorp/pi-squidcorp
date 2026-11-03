export const RESERVED_RECIPE_NAMES = ["validate", "merge"] as const;

export type Recipe = {
	name: string;
	description: string;
	prompt?: string;
	cmd?: string;
	blocking?: boolean;
};

export type ValidationIssue = {
	path: string;
	message: string;
};

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export function isReservedRecipeName(name: string): boolean {
	return (RESERVED_RECIPE_NAMES as readonly string[]).includes(name);
}

export function isValidRecipeName(name: string): boolean {
	return NAME_PATTERN.test(name);
}

export function hasText(value: string | undefined): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

export function parseRecipes(data: unknown): {
	recipes: Recipe[];
	issues: ValidationIssue[];
} {
	if (!Array.isArray(data)) {
		return {
			recipes: [],
			issues: [{ path: "$", message: "justfile.json must be a JSON array of recipes" }],
		};
	}

	const recipes: Recipe[] = [];
	const issues: ValidationIssue[] = [];
	const seen = new Map<string, number>();

	for (const [index, item] of data.entries()) {
		const parsed = parseRecipe(item, index);
		issues.push(...parsed.issues);
		if (!parsed.recipe) continue;

		const previous = seen.get(parsed.recipe.name);
		if (previous !== undefined) {
			issues.push({
				path: `$[${index}].name`,
				message: `duplicate name "${parsed.recipe.name}" (also at $[${previous}])`,
			});
			continue;
		}

		seen.set(parsed.recipe.name, index);
		recipes.push(parsed.recipe);
	}

	return { recipes, issues };
}

function parseRecipe(
	item: unknown,
	index: number,
): { recipe: Recipe | undefined; issues: ValidationIssue[] } {
	const path = `$[${index}]`;
	if (!isRecord(item)) {
		return { recipe: undefined, issues: [{ path, message: "recipe must be an object" }] };
	}

	const issues: ValidationIssue[] = [];
	const name = readRequiredString(item, "name", path, issues);
	const description = readRequiredString(item, "description", path, issues);
	const cmd = readOptionalString(item, "cmd", path, issues);
	const prompt = readOptionalString(item, "prompt", path, issues);
	const blocking = readOptionalBoolean(item, "blocking", path, issues);

	if (name && isReservedRecipeName(name)) {
		issues.push({
			path: `${path}.name`,
			message: `"${name}" is reserved for /just:${name}`,
		});
	} else if (name && !isValidRecipeName(name)) {
		issues.push({
			path: `${path}.name`,
			message: "name must start with a letter or underscore and contain only letters, digits, _ or -",
		});
	}

	if (!hasText(cmd) && !hasText(prompt)) {
		issues.push({
			path,
			message: "recipe must have a non-empty cmd and/or prompt",
		});
	}

	if (blocking === true && !hasText(prompt)) {
		issues.push({
			path: `${path}.prompt`,
			message: "blocking recipes require a prompt (cmd is not executed)",
		});
	}

	if (issues.length > 0 || !name || !description) {
		return { recipe: undefined, issues };
	}

	const recipe: Recipe = { name, description };
	if (hasText(cmd)) recipe.cmd = cmd;
	if (hasText(prompt)) recipe.prompt = prompt;
	if (blocking !== undefined) recipe.blocking = blocking;
	return { recipe, issues };
}

export function serializeRecipes(recipes: Recipe[]): string {
	return `${JSON.stringify(recipes.map(serializeRecipe), null, 2)}\n`;
}

function serializeRecipe(recipe: Recipe): Record<string, unknown> {
	const out: Record<string, unknown> = {
		name: recipe.name,
		description: recipe.description,
	};
	if (recipe.cmd !== undefined) out.cmd = recipe.cmd;
	if (recipe.prompt !== undefined) out.prompt = recipe.prompt;
	if (recipe.blocking !== undefined) out.blocking = recipe.blocking;
	return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
	item: Record<string, unknown>,
	key: string,
	path: string,
	issues: ValidationIssue[],
): string | undefined {
	const value = item[key];
	if (typeof value !== "string" || value.trim().length === 0) {
		issues.push({ path: `${path}.${key}`, message: `${key} must be a non-empty string` });
		return undefined;
	}
	return value.trim();
}

function readOptionalString(
	item: Record<string, unknown>,
	key: string,
	path: string,
	issues: ValidationIssue[],
): string | undefined {
	if (!(key in item) || item[key] === undefined) return undefined;
	const value = item[key];
	if (typeof value !== "string") {
		issues.push({ path: `${path}.${key}`, message: `${key} must be a string` });
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? value : undefined;
}

function readOptionalBoolean(
	item: Record<string, unknown>,
	key: string,
	path: string,
	issues: ValidationIssue[],
): boolean | undefined {
	if (!(key in item) || item[key] === undefined) return undefined;
	const value = item[key];
	if (typeof value !== "boolean") {
		issues.push({ path: `${path}.${key}`, message: `${key} must be a boolean` });
		return undefined;
	}
	return value;
}
