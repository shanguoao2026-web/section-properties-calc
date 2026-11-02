/**
 * Centroidal cross-section properties. Geometry is in millimetres.
 * x is the horizontal centroidal axis, so Ix uses the height of a rectangle.
 */

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

export type ShapeName = "rect" | "circle" | "tube" | "hollow-rect";

export interface Dimensions {
  b?: number;
  h?: number;
  d?: number;
  od?: number;
  id?: number;
  t?: number;
}

export interface SectionResult {
  shape: ShapeName;
  dimensions: Dimensions;
  /** Area, mm². */
  A: number;
  /** Second moment about the horizontal centroidal axis, mm⁴. */
  Ix: number;
  /** Second moment about the vertical centroidal axis, mm⁴. Rect and hollow-rect only. */
  Iy?: number;
  /** Elastic section modulus Ix/c, mm³. */
  Zx: number;
  /** Elastic section modulus Iy/(b/2), mm³. Rect and hollow-rect only. */
  Zy?: number;
  /** Radius of gyration sqrt(Ix/A), mm. */
  r: number;
  /** Bending moment about the horizontal axis, N·m. */
  moment?: number;
  /** Maximum bending stress M·1000/Zx, MPa. */
  sigma?: number;
}

export type ComputeInput =
  | { shape: "rect"; b: number; h: number; moment?: number }
  | { shape: "circle"; d: number; moment?: number }
  | { shape: "tube"; od: number; id: number; moment?: number }
  | { shape: "hollow-rect"; b: number; h: number; t: number; moment?: number };

/** Maximum bending stress in MPa. Moment is N·m and Zx is mm³. */
export function bendingStress(momentNm: number, zxMm3: number): number {
  return (momentNm * 1000) / zxMm3;
}

function assertPositive(label: string, value: number): void {
  if (!Number.isFinite(value) || !(value > 0)) {
    throw new InputError(`${label} must be a finite positive number`);
  }
}

function withMoment(result: SectionResult, moment: number | undefined): SectionResult {
  if (moment === undefined) {
    return result;
  }
  assertPositive("moment", moment);
  return {
    ...result,
    moment,
    sigma: bendingStress(moment, result.Zx),
  };
}

export function compute(input: ComputeInput): SectionResult {
  switch (input.shape) {
    case "rect":
      return withMoment(rectSection(input.b, input.h), input.moment);
    case "circle":
      return withMoment(circleSection(input.d), input.moment);
    case "tube":
      return withMoment(tubeSection(input.od, input.id), input.moment);
    case "hollow-rect":
      return withMoment(hollowRectSection(input.b, input.h, input.t), input.moment);
  }
}

function rectSection(b: number, h: number): SectionResult {
  assertPositive("b", b);
  assertPositive("h", h);
  const A = b * h;
  const Ix = (b * h ** 3) / 12;
  const Iy = (h * b ** 3) / 12;
  return {
    shape: "rect",
    dimensions: { b, h },
    A,
    Ix,
    Iy,
    Zx: Ix / (h / 2),
    Zy: Iy / (b / 2),
    r: Math.sqrt(Ix / A),
  };
}

function circleSection(d: number): SectionResult {
  assertPositive("d", d);
  const A = (Math.PI * d * d) / 4;
  const Ix = (Math.PI * d ** 4) / 64;
  return {
    shape: "circle",
    dimensions: { d },
    A,
    Ix,
    Zx: Ix / (d / 2),
    r: Math.sqrt(Ix / A),
  };
}

function tubeSection(od: number, id: number): SectionResult {
  assertPositive("od", od);
  assertPositive("id", id);
  if (!(id < od)) {
    throw new InputError("id must be less than od");
  }
  const A = (Math.PI / 4) * (od * od - id * id);
  const Ix = (Math.PI / 64) * (od ** 4 - id ** 4);
  return {
    shape: "tube",
    dimensions: { od, id },
    A,
    Ix,
    Zx: Ix / (od / 2),
    r: Math.sqrt(Ix / A),
  };
}

function hollowRectSection(b: number, h: number, t: number): SectionResult {
  assertPositive("b", b);
  assertPositive("h", h);
  assertPositive("t", t);
  if (!(2 * t < b) || !(2 * t < h)) {
    throw new InputError("2t must be less than b and 2t must be less than h");
  }
  const bi = b - 2 * t;
  const hi = h - 2 * t;
  const A = b * h - bi * hi;
  const Ix = (b * h ** 3 - bi * hi ** 3) / 12;
  const Iy = (h * b ** 3 - hi * bi ** 3) / 12;
  return {
    shape: "hollow-rect",
    dimensions: { b, h, t },
    A,
    Ix,
    Iy,
    Zx: Ix / (h / 2),
    Zy: Iy / (b / 2),
    r: Math.sqrt(Ix / A),
  };
}
