import { isReservedRecipeName, isValidRecipeName, type Recipe } from "./schema.ts";
import type { JustRecipe } from "./just.ts";

export type MergeResult = {
	recipes: Recipe[];
	added: string[];
	duplicates: string[];
	skippedReserved: string[];
	skippedInvalid: string[];
};

export function mergeJustRecipes(existing: Recipe[], justRecipes: JustRecipe[]): MergeResult {
	const recipes = [...existing];
	const known = new Set(existing.map((recipe) => recipe.name));
	const added: string[] = [];
	const duplicates: string[] = [];
	const skippedReserved: string[] = [];
	const skippedInvalid: string[] = [];

	for (const justRecipe of justRecipes) {
		if (known.has(justRecipe.name)) {
			duplicates.push(justRecipe.name);
			continue;
		}
		if (isReservedRecipeName(justRecipe.name)) {
			skippedReserved.push(justRecipe.name);
			continue;
		}
		if (!isValidRecipeName(justRecipe.name)) {
			skippedInvalid.push(justRecipe.name);
			continue;
		}

		known.add(justRecipe.name);
		added.push(justRecipe.name);
		recipes.push(justRecipeToOverlay(justRecipe));
	}

	return { recipes, added, duplicates, skippedReserved, skippedInvalid };
}

function justRecipeToOverlay(justRecipe: JustRecipe): Recipe {
	const description = justRecipe.doc?.trim() || `Run \`just ${justRecipe.name}\``;
	return {
		name: justRecipe.name,
		description,
		cmd: `just ${justRecipe.name}`,
	};
}
