import assert from "node:assert/strict";
import { test } from "node:test";
import { parseJustDump, publicJustRecipes } from "./just.ts";

test("parses just --dump JSON and drops private recipes", () => {
	const recipes = publicJustRecipes(
		parseJustDump({
			recipes: {
				check: { name: "check", doc: "Run checks", private: false },
				_setup: { name: "_setup", doc: null, private: false },
				hidden: { name: "hidden", doc: null, private: true },
			},
		}),
	);
	assert.deepEqual(
		recipes.map((recipe) => recipe.name),
		["check"],
	);
});

test("throws when recipes are missing", () => {
	assert.throws(() => parseJustDump({}), /recipes object/);
});
