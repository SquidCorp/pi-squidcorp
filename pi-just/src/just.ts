export type JustRecipe = {
	name: string;
	doc: string | null;
	private: boolean;
};

export function parseJustDump(data: unknown): JustRecipe[] {
	if (!isRecord(data) || !isRecord(data.recipes)) {
		throw new Error("just --dump JSON did not contain a recipes object");
	}

	const recipes: JustRecipe[] = [];
	for (const value of Object.values(data.recipes)) {
		if (!isRecord(value) || typeof value.name !== "string") continue;
		const doc = typeof value.doc === "string" ? value.doc : null;
		recipes.push({
			name: value.name,
			doc,
			private: value.private === true,
		});
	}
	return recipes;
}

export function publicJustRecipes(recipes: JustRecipe[]): JustRecipe[] {
	return recipes.filter((recipe) => !recipe.private && !recipe.name.startsWith("_"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
