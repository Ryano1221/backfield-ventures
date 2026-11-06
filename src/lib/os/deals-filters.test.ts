import assert from "node:assert/strict";
import test from "node:test";
import { RATING_FILTERS } from "./deals";

test("rating filter chips are capitalized like the rating buttons", () => {
  assert.deepEqual(
    RATING_FILTERS.map((filter) => filter.label),
    ["All", "Great", "Good", "Maybe", "No", "Unrated"],
  );
});
