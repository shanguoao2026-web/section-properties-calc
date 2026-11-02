import type { SectionResult } from "./calc.js";

const DIMENSION_KEYS = ["b", "h", "d", "od", "id", "t"] as const;

interface Row {
  field: string;
  value: string;
  unit: string;
}

/** Format a display number. Integers drop the decimal point; other values keep fixed decimals. */
export function formatNumber(value: number, decimals: number): string {
  const text = value.toFixed(decimals);
  if (/^-?\d+\.0+$/.test(text)) {
    return text.replace(/\.0+$/, "");
  }
  return text;
}

export function formatInput(value: number): string {
  if (Object.is(value, -0)) {
    return "0";
  }
  return String(value);
}

function propertyRows(result: SectionResult): Row[] {
  const rows: Row[] = [
    { field: "A", value: formatNumber(result.A, 2), unit: "mm²" },
    { field: "Ix", value: formatNumber(result.Ix, 1), unit: "mm⁴" },
  ];
  if (result.Iy !== undefined) {
    rows.push({ field: "Iy", value: formatNumber(result.Iy, 1), unit: "mm⁴" });
  }
  rows.push({ field: "Zx", value: formatNumber(result.Zx, 1), unit: "mm³" });
  if (result.Zy !== undefined) {
    rows.push({ field: "Zy", value: formatNumber(result.Zy, 1), unit: "mm³" });
  }
  rows.push({ field: "r", value: formatNumber(result.r, 2), unit: "mm" });
  if (result.sigma !== undefined) {
    rows.push({ field: "sigma", value: formatNumber(result.sigma, 2), unit: "MPa" });
  }
  return rows;
}

function formatTable(rows: Row[]): string {
  const header: Row = { field: "property", value: "value", unit: "unit" };
  const all = [header, ...rows];
  const fieldWidth = Math.max(...all.map((row) => row.field.length));
  const valueWidth = Math.max(...all.map((row) => row.value.length));
  const unitWidth = Math.max(...all.map((row) => row.unit.length));
  const line = (row: Row): string =>
    `${row.field.padEnd(fieldWidth)}  ${row.value.padEnd(valueWidth)}  ${row.unit}`;
  const rule = `${"-".repeat(fieldWidth)}  ${"-".repeat(valueWidth)}  ${"-".repeat(unitWidth)}`;
  return [line(header), rule, ...rows.map(line)].join("\n");
}

/** Human-readable report. The property block is a table; A, r, and sigma use 2 decimals, I and Z use 1. */
export function formatReport(result: SectionResult): string {
  const lines: string[] = [`shape: ${result.shape}`];
  for (const key of DIMENSION_KEYS) {
    const value = result.dimensions[key];
    if (value !== undefined) {
      lines.push(`${key}: ${formatInput(value)} mm`);
    }
  }
  if (result.moment !== undefined) {
    lines.push(`moment: ${formatInput(result.moment)} N·m`);
  }
  lines.push("");
  lines.push(formatTable(propertyRows(result)));
  return `${lines.join("\n")}\n`;
}

/** Full-precision JSON. Null fields are omitted. */
export function formatJson(result: SectionResult): string {
  const out: Record<string, string | number> = { shape: result.shape };
  for (const key of DIMENSION_KEYS) {
    const value = result.dimensions[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  out.A = result.A;
  out.Ix = result.Ix;
  if (result.Iy !== undefined) {
    out.Iy = result.Iy;
  }
  out.Zx = result.Zx;
  if (result.Zy !== undefined) {
    out.Zy = result.Zy;
  }
  out.r = result.r;
  if (result.moment !== undefined) {
    out.moment = result.moment;
  }
  if (result.sigma !== undefined) {
    out.sigma = result.sigma;
  }
  return `${JSON.stringify(out, null, 2)}\n`;
}
