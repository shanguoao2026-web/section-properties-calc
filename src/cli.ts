#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  InputError,
  compute,
  type ComputeInput,
  type ShapeName,
} from "./calc.js";
import { formatJson, formatReport } from "./format.js";

const NUMBER_FLAGS = new Set(["b", "h", "d", "od", "id", "t", "moment"]);

const REQUIRED: Record<ShapeName, readonly string[]> = {
  rect: ["b", "h"],
  circle: ["d"],
  tube: ["od", "id"],
  "hollow-rect": ["b", "h", "t"],
};

const DECIMAL = /^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

const HELP = `section-properties-calc — cross-section properties of beam sections

Usage:
  node dist/cli.js --shape rect --b <mm> --h <mm> [--moment <N·m>] [--json]
  node dist/cli.js --shape circle --d <mm> [--moment <N·m>] [--json]
  node dist/cli.js --shape tube --od <mm> --id <mm> [--moment <N·m>] [--json]
  node dist/cli.js --shape hollow-rect --b <mm> --h <mm> --t <mm> [--moment <N·m>] [--json]
  node dist/cli.js --help

Shapes:
  rect         Solid rectangle. b is width, h is height.
  circle       Solid circle. d is the diameter.
  tube         Circular tube. od is the outer diameter, id is the inner diameter.
  hollow-rect  Rectangular tube with a uniform wall thickness t.

Outputs (centroidal elastic properties):
  A      area (mm²)
  Ix     second moment about the horizontal centroidal axis (mm⁴)
  Iy     second moment about the vertical centroidal axis (mm⁴), rect and hollow-rect
  Zx     elastic section modulus Ix/c (mm³). c is h/2, d/2, or od/2
  Zy     elastic section modulus Iy/(b/2) (mm³), rect and hollow-rect
  r      radius of gyration sqrt(Ix/A) (mm)
  sigma  maximum bending stress M·1000/Zx (MPa) when --moment is set

--moment is the bending moment about the horizontal axis, in N·m.
The table rounds A, r, and sigma to 2 decimal places and Ix, Iy, Zx, and Zy to 1.
--json prints one object with full-precision numbers.

Validation:
  Dimensions and --moment must be finite and greater than zero.
  A tube requires id < od.
  A hollow rectangle requires 2t < b and 2t < h.
  Invalid input is written to stderr and the process exits 1.

Options:
  --json   Print JSON on stdout instead of the table
  --help   Show this help

Examples:
  node dist/cli.js --shape rect --b 40 --h 60
  node dist/cli.js --shape circle --d 50
  node dist/cli.js --shape tube --od 50 --id 40
  node dist/cli.js --shape hollow-rect --b 60 --h 80 --t 5 --moment 1000
`;

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function run(argv: string[]): RunResult {
  try {
    if (argv.some((token) => token === "--help")) {
      return { code: 0, stdout: HELP, stderr: "" };
    }
    const parsed = parseArgv(argv);
    const result = compute(parsed.input);
    const stdout = parsed.json ? formatJson(result) : formatReport(result);
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    if (err instanceof InputError) {
      return { code: 1, stdout: "", stderr: `error: ${err.message}\n` };
    }
    throw err;
  }
}

interface ParsedArgs {
  json: boolean;
  input: ComputeInput;
}

function parseArgv(argv: string[]): ParsedArgs {
  const values = new Map<string, number>();
  let json = false;
  let shape: ShapeName | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === undefined) {
      continue;
    }
    if (!token.startsWith("--") || token === "--") {
      throw new InputError(`unexpected argument '${token}'`);
    }

    const equalsAt = token.indexOf("=", 2);
    const name = equalsAt === -1 ? token.slice(2) : token.slice(2, equalsAt);
    const inline = equalsAt === -1 ? undefined : token.slice(equalsAt + 1);
    if (name.length === 0) {
      throw new InputError(`unknown option '${token}'`);
    }

    if (name === "json") {
      if (inline !== undefined) {
        throw new InputError("--json does not take a value");
      }
      json = true;
      continue;
    }
    if (name === "help") {
      throw new InputError("--help does not take a value");
    }

    const raw = inline !== undefined ? inline : readValue(argv, i, name);
    if (inline === undefined) {
      i += 1;
    }

    if (name === "shape") {
      if (shape !== undefined) {
        throw new InputError("--shape was given more than once");
      }
      shape = parseShape(raw);
      continue;
    }

    if (!NUMBER_FLAGS.has(name)) {
      throw new InputError(`unknown option '--${name}'`);
    }
    if (values.has(name)) {
      throw new InputError(`--${name} was given more than once`);
    }
    values.set(name, parsePositive(name, raw));
  }

  if (shape === undefined) {
    throw new InputError("missing --shape. Expected rect, circle, tube, or hollow-rect");
  }

  for (const key of values.keys()) {
    const allowed = REQUIRED[shape];
    if (key !== "moment" && !allowed.includes(key)) {
      throw new InputError(`--${key} does not apply to shape ${shape}`);
    }
  }

  return { json, input: buildInput(shape, values) };
}

function readValue(argv: string[], index: number, name: string): string {
  const next = argv[index + 1];
  if (next === undefined || next.startsWith("--")) {
    throw new InputError(`missing value for --${name}`);
  }
  return next;
}

function parseShape(raw: string): ShapeName {
  const text = raw.trim();
  if (text === "rect" || text === "circle" || text === "tube" || text === "hollow-rect") {
    return text;
  }
  throw new InputError(
    `unknown shape '${text}'. Expected rect, circle, tube, or hollow-rect`,
  );
}

function parsePositive(flag: string, raw: string): number {
  const text = raw.trim();
  if (!DECIMAL.test(text)) {
    throw new InputError(`--${flag} must be a finite positive number`);
  }
  const value = Number(text);
  if (!Number.isFinite(value) || !(value > 0)) {
    throw new InputError(`--${flag} must be a finite positive number`);
  }
  return value;
}

function requireFlag(values: Map<string, number>, flag: string, shape: ShapeName): number {
  const value = values.get(flag);
  if (value === undefined) {
    throw new InputError(`shape ${shape} requires --${flag}`);
  }
  return value;
}

function buildInput(shape: ShapeName, values: Map<string, number>): ComputeInput {
  const moment = values.get("moment");
  switch (shape) {
    case "rect": {
      const b = requireFlag(values, "b", shape);
      const h = requireFlag(values, "h", shape);
      return moment === undefined ? { shape, b, h } : { shape, b, h, moment };
    }
    case "circle": {
      const d = requireFlag(values, "d", shape);
      return moment === undefined ? { shape, d } : { shape, d, moment };
    }
    case "tube": {
      const od = requireFlag(values, "od", shape);
      const id = requireFlag(values, "id", shape);
      return moment === undefined ? { shape, od, id } : { shape, od, id, moment };
    }
    case "hollow-rect": {
      const b = requireFlag(values, "b", shape);
      const h = requireFlag(values, "h", shape);
      const t = requireFlag(values, "t", shape);
      return moment === undefined ? { shape, b, h, t } : { shape, b, h, t, moment };
    }
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  try {
    const invoked = fs.realpathSync(path.resolve(entry));
    const self = fs.realpathSync(fileURLToPath(import.meta.url));
    return invoked === self;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  const result = run(process.argv.slice(2));
  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
  process.exitCode = result.code;
}
