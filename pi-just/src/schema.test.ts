import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRecipes, serializeRecipes } from "./schema.ts";

test("rejects a non-array catalog", () => {
	const result = parseRecipes({ name: "nope" });
	assert.equal(result.recipes.length, 0);
	assert.equal(result.issues[0]?.message.includes("array"), true);
});

test("accepts cmd-only and prompt-only recipes", () => {
	const result = parseRecipes([
		{ name: "check-api", description: "API checks", cmd: "just check-api" },
		{ name: "review", description: "Review diff", prompt: "Review the diff." },
	]);
	assert.deepEqual(result.issues, []);
	assert.equal(result.recipes.length, 2);
});

test("requires prompt or cmd", () => {
	const result = parseRecipes([{ name: "empty", description: "Nope" }]);
	assert.equal(result.recipes.length, 0);
	assert.match(result.issues[0]?.message ?? "", /cmd and\/or prompt/);
});

test("rejects reserved names and duplicates", () => {
	const result = parseRecipes([
		{ name: "validate", description: "x", cmd: "true" },
		{ name: "check", description: "a", cmd: "true" },
		{ name: "check", description: "b", cmd: "true" },
	]);
	assert.equal(result.issues.some((issue) => issue.message.includes("reserved")), true);
	assert.equal(result.issues.some((issue) => issue.message.includes("duplicate")), true);
});

test("blocking without prompt is an error", () => {
	const result = parseRecipes([
		{ name: "dev-web", description: "Next dev", cmd: "pnpm dev", blocking: true },
	]);
	assert.equal(result.recipes.length, 0);
	assert.equal(result.issues.some((issue) => issue.message.includes("blocking recipes require a prompt")), true);
});

test("round-trips known fields", () => {
	const recipes = parseRecipes([
		{
			name: "check-api",
			description: "API checks",
			cmd: "just check-api",
			prompt: "Fix API check failures.",
			blocking: false,
		},
	]).recipes;
	const again = parseRecipes(JSON.parse(serializeRecipes(recipes)));
	assert.deepEqual(again.issues, []);
	assert.deepEqual(again.recipes, recipes);
});
