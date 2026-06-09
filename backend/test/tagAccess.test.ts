import assert from "node:assert/strict";
import test from "node:test";
import { getAuthorizedTagIds } from "../src/services/tagAccess.js";

test("returns requested tag ids when every tag is visible to the user", () => {
  const authorized = getAuthorizedTagIds("user_1", ["system", "mine"], [
    { id: "system", userId: null },
    { id: "mine", userId: "user_1" },
  ]);

  assert.deepEqual(authorized, ["system", "mine"]);
});

test("rejects requested tag ids when any tag belongs to another user", () => {
  assert.throws(
    () =>
      getAuthorizedTagIds("user_1", ["mine", "theirs"], [
        { id: "mine", userId: "user_1" },
        { id: "theirs", userId: "user_2" },
      ]),
    /Invalid tag selection/
  );
});

test("rejects requested tag ids that do not exist", () => {
  assert.throws(
    () => getAuthorizedTagIds("user_1", ["missing"], []),
    /Invalid tag selection/
  );
});
