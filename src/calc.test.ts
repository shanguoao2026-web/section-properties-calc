import assert from "node:assert/strict";
import { test } from "node:test";

import { InputError, bendingStress, compute } from "./calc.js";
import { formatNumber } from "./format.js";

test("rect b40 h60 → A 2400, Ix 720000, Zx 24000, r 17.32", () => {
  const section = compute({ shape: "rect", b: 40, h: 60 });
  assert.equal(section.A, 2400);
  assert.equal(section.Ix, 720000);
  assert.equal(section.Zx, 24000);
  assert.equal(formatNumber(section.r, 2), "17.32");
  assert.equal(section.Iy, 320000);
  assert.equal(section.Zy, 16000);
  assert.equal(section.Ix, (40 * 60 ** 3) / 12);
  assert.equal(section.Iy, (60 * 40 ** 3) / 12);
  assert.equal(section.Zx, section.Ix / 30);
  assert.equal(section.Zy, section.Iy / 20);
  assert.equal(section.r, Math.sqrt(section.Ix / section.A));
});

test("circle d50 → A 1963.50, I 306796.2, Z 12271.8", () => {
  const section = compute({ shape: "circle", d: 50 });
  assert.equal(formatNumber(section.A, 2), "1963.50");
  assert.equal(formatNumber(section.Ix, 1), "306796.2");
  assert.equal(formatNumber(section.Zx, 1), "12271.8");
  assert.equal(section.A, (Math.PI * 50 * 50) / 4);
  assert.equal(section.Ix, (Math.PI * 50 ** 4) / 64);
  assert.equal(section.Zx, section.Ix / 25);
  assert.ok(Math.abs(section.r - 12.5) < 1e-9);
  assert.equal(formatNumber(section.r, 2), "12.50");
  assert.equal(section.Iy, undefined);
  assert.equal(section.Zy, undefined);
});

test("tube od50 id40 → A 706.86, I 181132.5, Z 7245.3", () => {
  const section = compute({ shape: "tube", od: 50, id: 40 });
  assert.equal(formatNumber(section.A, 2), "706.86");
  assert.equal(formatNumber(section.Ix, 1), "181132.5");
  assert.equal(formatNumber(section.Zx, 1), "7245.3");
  assert.equal(section.A, (Math.PI / 4) * (50 ** 2 - 40 ** 2));
  assert.equal(section.Ix, (Math.PI / 64) * (50 ** 4 - 40 ** 4));
  assert.equal(section.Zx, section.Ix / 25);
  assert.equal(section.r, Math.sqrt(section.Ix / section.A));
});

test("hollow-rect b60 h80 t5 → A 1300, Ix 1130833.3, Zx 28270.8; moment 1000 → σ 35.37 MPa", () => {
  const section = compute({ shape: "hollow-rect", b: 60, h: 80, t: 5, moment: 1000 });
  assert.equal(section.A, 1300);
  assert.equal(section.A, 2 * 5 * (60 + 80 - 2 * 5));
  assert.equal(formatNumber(section.Ix, 1), "1130833.3");
  assert.equal(formatNumber(section.Zx, 1), "28270.8");
  assert.equal(section.Ix, (60 * 80 ** 3 - 50 * 70 ** 3) / 12);
  assert.equal(section.Iy, (80 * 60 ** 3 - 70 * 50 ** 3) / 12);
  assert.equal(formatNumber(section.Iy ?? NaN, 1), "710833.3");
  assert.equal(formatNumber(section.Zy ?? NaN, 1), "23694.4");
  assert.equal(section.Zx, section.Ix / 40);
  assert.equal(section.sigma, bendingStress(1000, section.Zx));
  assert.equal(formatNumber(section.sigma ?? NaN, 2), "35.37");
  assert.equal(section.moment, 1000);
});

test("bending stress is M·1000/Zx", () => {
  const section = compute({ shape: "rect", b: 40, h: 60, moment: 2.5 });
  assert.equal(section.sigma, (2.5 * 1000) / 24000);
});

test("tube od40 id50 is rejected", () => {
  assert.throws(
    () => compute({ shape: "tube", od: 40, id: 50 }),
    (err: unknown) => {
      assert.ok(err instanceof InputError);
      assert.match(err.message, /id must be less than od/);
      return true;
    },
  );
});

test("tube id equal to od is rejected", () => {
  assert.throws(() => compute({ shape: "tube", od: 50, id: 50 }), InputError);
});

test("hollow-rect rejects a wall that is not strictly inside both sides", () => {
  assert.throws(() => compute({ shape: "hollow-rect", b: 10, h: 30, t: 5 }), InputError);
  assert.throws(() => compute({ shape: "hollow-rect", b: 30, h: 10, t: 5 }), InputError);
  assert.throws(() => compute({ shape: "hollow-rect", b: 10, h: 30, t: 6 }), InputError);
});

test("non-positive and non-finite dimensions are rejected", () => {
  assert.throws(() => compute({ shape: "rect", b: 0, h: 60 }), InputError);
  assert.throws(() => compute({ shape: "rect", b: -40, h: 60 }), InputError);
  assert.throws(() => compute({ shape: "circle", d: Number.NaN }), InputError);
  assert.throws(() => compute({ shape: "circle", d: Number.POSITIVE_INFINITY }), InputError);
  assert.throws(() => compute({ shape: "rect", b: 40, h: 60, moment: 0 }), InputError);
  assert.throws(() => compute({ shape: "rect", b: 40, h: 60, moment: -1 }), InputError);
});
