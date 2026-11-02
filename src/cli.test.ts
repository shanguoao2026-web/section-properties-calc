import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { compute } from "./calc.js";
import { formatJson, formatNumber, formatReport } from "./format.js";

const cliPath = fileURLToPath(new URL("./cli.js", import.meta.url));

function run(args: string[]) {
  const env = { ...process.env };
  delete env.FORCE_COLOR;
  delete env.NO_COLOR;
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8", env });
}

test("rect table prints A 2400, Ix 720000, Zx 24000, r 17.32", () => {
  const res = run(["--shape", "rect", "--b", "40", "--h", "60"]);
  assert.equal(res.status, 0);
  assert.equal(res.stderr, "");
  assert.equal(res.stdout, formatReport(compute({ shape: "rect", b: 40, h: 60 })));
  assert.match(res.stdout, /\b2400\b/);
  assert.match(res.stdout, /\b720000\b/);
  assert.match(res.stdout, /\b24000\b/);
  assert.match(res.stdout, /\b17\.32\b/);
  assert.match(res.stdout, /\b320000\b/);
  assert.match(res.stdout, /\b16000\b/);
  assert.match(res.stdout, /\bIy\b/);
  assert.match(res.stdout, /\bZy\b/);
});

test("circle table prints A 1963.50, I 306796.2, Z 12271.8", () => {
  const res = run(["--shape", "circle", "--d", "50"]);
  assert.equal(res.status, 0);
  assert.equal(res.stderr, "");
  assert.match(res.stdout, /1963\.50/);
  assert.match(res.stdout, /306796\.2/);
  assert.match(res.stdout, /12271\.8/);
  assert.doesNotMatch(res.stdout, /\bIy\b/);
  assert.doesNotMatch(res.stdout, /\bZy\b/);
});

test("tube table prints A 706.86, I 181132.5, Z 7245.3", () => {
  const res = run(["--shape", "tube", "--od", "50", "--id", "40"]);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /706\.86/);
  assert.match(res.stdout, /181132\.5/);
  assert.match(res.stdout, /7245\.3/);
});

test("hollow-rect with moment 1000 prints σ 35.37 MPa", () => {
  const res = run([
    "--shape",
    "hollow-rect",
    "--b",
    "60",
    "--h",
    "80",
    "--t",
    "5",
    "--moment",
    "1000",
  ]);
  assert.equal(res.status, 0);
  assert.equal(res.stderr, "");
  assert.match(res.stdout, /\b1300\b/);
  assert.match(res.stdout, /1130833\.3/);
  assert.match(res.stdout, /28270\.8/);
  assert.match(res.stdout, /35\.37/);
  assert.match(res.stdout, /MPa/);
  assert.match(res.stdout, /\bIy\b/);
  assert.match(res.stdout, /\bZy\b/);
});

test("json output keeps full precision and the same check values", () => {
  const res = run(["--json", "--shape=circle", "--d=50"]);
  assert.equal(res.status, 0);
  assert.equal(res.stderr, "");
  const body = JSON.parse(res.stdout) as { A: number; Ix: number; Zx: number; r: number; shape: string };
  assert.equal(res.stdout, formatJson(compute({ shape: "circle", d: 50 })));
  assert.equal(body.shape, "circle");
  assert.equal(formatNumber(body.A, 2), "1963.50");
  assert.equal(formatNumber(body.Ix, 1), "306796.2");
  assert.equal(formatNumber(body.Zx, 1), "12271.8");
  assert.equal(formatNumber(body.r, 2), "12.50");
});

test("hollow-rect json stress rounds to 35.37 MPa", () => {
  const res = run(["--shape", "hollow-rect", "--b", "60", "--h", "80", "--t", "5", "--moment", "1000", "--json"]);
  assert.equal(res.status, 0);
  const body = JSON.parse(res.stdout) as { A: number; Ix: number; Zx: number; sigma: number; moment: number };
  assert.equal(body.A, 1300);
  assert.equal(body.moment, 1000);
  assert.equal(formatNumber(body.Ix, 1), "1130833.3");
  assert.equal(formatNumber(body.Zx, 1), "28270.8");
  assert.equal(formatNumber(body.sigma, 2), "35.37");
});

test("tube od40 id50 exits 1 and writes the error to stderr", () => {
  const res = run(["--shape", "tube", "--od", "40", "--id", "50"]);
  assert.equal(res.status, 1);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /^error: id must be less than od\n$/);
});

test("invalid geometry still exits 1 when --json is set", () => {
  const res = run(["--json", "--shape", "tube", "--od", "40", "--id", "40"]);
  assert.equal(res.status, 1);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /id must be less than od/);
});

test("hollow-rect wall checks exit 1", () => {
  const tooWide = run(["--shape", "hollow-rect", "--b", "10", "--h", "40", "--t", "5"]);
  assert.equal(tooWide.status, 1);
  assert.equal(tooWide.stdout, "");
  assert.match(tooWide.stderr, /2t must be less than b/);

  const tooTall = run(["--shape", "hollow-rect", "--b", "40", "--h", "10", "--t", "5"]);
  assert.equal(tooTall.status, 1);
  assert.match(tooTall.stderr, /2t must be less than h/);
});

test("non-finite and non-positive flags exit 1", () => {
  for (const args of [
    ["--shape", "rect", "--b", "0", "--h", "60"],
    ["--shape", "rect", "--b", "-5", "--h", "60"],
    ["--shape", "rect", "--b", "abc", "--h", "60"],
    ["--shape", "circle", "--d", "Infinity"],
    ["--shape", "circle", "--d", "NaN"],
    ["--shape", "circle", "--d", "1e309"],
    ["--shape", "rect", "--b", "40", "--h", "60", "--moment", "0"],
  ]) {
    const res = run(args);
    assert.equal(res.status, 1, args.join(" "));
    assert.equal(res.stdout, "");
    assert.match(res.stderr, /^error: .+\n$/);
  }
});

test("missing shape, unknown shape, and unknown options exit 1", () => {
  const missing = run([]);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /missing --shape/);

  const unknown = run(["--shape", "ibeam", "--b", "10", "--h", "20"]);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /unknown shape/);

  const extra = run(["--shape", "circle", "--d", "50", "--b", "10"]);
  assert.equal(extra.status, 1);
  assert.match(extra.stderr, /--b does not apply/);

  const flag = run(["--shape", "rect", "--b", "40", "--h", "60", "--foo", "1"]);
  assert.equal(flag.status, 1);
  assert.match(flag.stderr, /unknown option/);
});

test("--help prints usage and exits 0, even with invalid geometry", () => {
  const res = run(["--shape", "tube", "--od", "40", "--id", "50", "--help"]);
  assert.equal(res.status, 0);
  assert.equal(res.stderr, "");
  assert.match(res.stdout, /hollow-rect/);
  assert.match(res.stdout, /--json/);
  assert.match(res.stdout, /--moment/);
  assert.match(res.stdout, /id < od/);
});

test("equals-form flags and scientific notation are accepted", () => {
  const res = run(["--shape=rect", "--b=4e1", "--h=60"]);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /\b2400\b/);
  assert.match(res.stdout, /\b17\.32\b/);
});
