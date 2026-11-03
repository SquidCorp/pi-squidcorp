import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeJustRecipes } from "./merge.ts";

test("adds new just recipes and flags duplicates", () => {
	const result = mergeJustRecipes(
		[{ name: "check-api", description: "mine", cmd: "echo overlay" }],
		[
			{ name: "check-api", doc: "team", private: false },
			{ name: "check-web", doc: "Web checks", private: false },
			{ name: "validate", doc: "collides", private: false },
		],
	);
	assert.deepEqual(result.added, ["check-web"]);
	assert.deepEqual(result.duplicates, ["check-api"]);
	assert.deepEqual(result.skippedReserved, ["validate"]);
	assert.equal(result.recipes.length, 2);
	assert.equal(result.recipes[1]?.cmd, "just check-web");
	assert.equal(result.recipes[0]?.cmd, "echo overlay");
});
