import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
const endpoint = process.env.EBAY_DELETION_ENDPOINT;
if (!verificationToken || !endpoint) {
  throw new Error("Set EBAY_VERIFICATION_TOKEN and EBAY_DELETION_ENDPOINT before running this test.");
}

const baseUrl = process.env.EBAY_TEST_BASE_URL ?? "http://localhost:3000";
const challengeCode = "test";
const url = new URL("/api/ebay/account-deletion", baseUrl);
url.searchParams.set("challenge_code", challengeCode);

const response = await fetch(url);
const body = await response.json();
const expected = createHash("sha256")
  .update(challengeCode + verificationToken + endpoint)
  .digest("hex");

assert.equal(response.status, 200);
assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/);
assert.deepEqual(body, { challengeResponse: expected });

console.log(JSON.stringify({ status: response.status, body }));
