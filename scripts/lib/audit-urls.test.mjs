import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCorruptUrl, isPublishableApplyUrl, isSaneHttpUrl } from "./audit-urls.mjs";

describe("isCorruptUrl", () => {
  it("rejects typo TLDs", () => {
    assert.equal(isCorruptUrl("https://mppsc.mp.gov.ln"), true);
    assert.equal(isCorruptUrl("https://ssc.gov.con/apply"), true);
  });

  it("rejects illegal path characters", () => {
    assert.equal(isCorruptUrl("https://ssc.gov.in/path^foo"), true);
  });

  it("accepts official hosts", () => {
    assert.equal(isCorruptUrl("https://upsc.gov.in/apply"), false);
    assert.equal(isSaneHttpUrl("https://ssc.nic.in/portal"), true);
  });
});

describe("isPublishableApplyUrl", () => {
  it("requires a sane official URL", () => {
    assert.equal(isPublishableApplyUrl("https://upsc.gov.in/apply"), true);
    assert.equal(isPublishableApplyUrl("https://mppsc.mp.gov.ln"), false);
    assert.equal(isPublishableApplyUrl("https://freejobalert.com/x"), false);
  });
});
