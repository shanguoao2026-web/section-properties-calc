# section-properties-calc

Command-line calculator for elastic cross-section properties of common beam sections. Dimensions are millimetres. There are no runtime dependencies.

It reports:

- **A** — area (mm²)
- **Ix** — second moment of area about the horizontal centroidal axis (mm⁴)
- **Iy** — second moment about the vertical centroidal axis (mm⁴), for `rect` and `hollow-rect`
- **Zx** — elastic section modulus `Ix / c` (mm³)
- **Zy** — elastic section modulus `Iy / (b/2)` (mm³), for `rect` and `hollow-rect`
- **r** — radius of gyration `sqrt(Ix / A)` (mm)
- **sigma** — maximum bending stress when `--moment` is set (MPa)

`x` is the horizontal axis through the centroid. For a rectangle, `b` is the width and `h` is the height, so `Ix = b h³ / 12` and the extreme-fibre distance is `c = h / 2`.

## Setup

Node.js 18 or newer.

```bash
npm install
npm test
```

`npm test` compiles TypeScript and runs the `node:test` suite.

## Usage

```bash
node dist/cli.js --shape rect --b <mm> --h <mm> [--moment <N·m>] [--json]
node dist/cli.js --shape circle --d <mm> [--moment <N·m>] [--json]
node dist/cli.js --shape tube --od <mm> --id <mm> [--moment <N·m>] [--json]
node dist/cli.js --shape hollow-rect --b <mm> --h <mm> --t <mm> [--moment <N·m>] [--json]
node dist/cli.js --help
```

After `npm run build`, `npx section-properties` runs the same program.

The default output is a table. `--json` prints one JSON object with full-precision numbers. In the table, area, radius of gyration, and stress are shown to 2 decimal places, and second moments and section moduli to 1 decimal place. Whole numbers are printed without a decimal point.

`--moment` is the bending moment about the horizontal centroidal axis, in newton-metres. The maximum bending stress is

```text
sigma = M * 1000 / Zx
```

`M * 1000` converts N·m to N·mm. Dividing by `Zx` in mm³ gives stress in N/mm², which is MPa.

## Examples

Solid rectangle, 40 mm wide and 60 mm deep:

```bash
node dist/cli.js --shape rect --b 40 --h 60
```

```text
shape: rect
b: 40 mm
h: 60 mm

property  value   unit
--------  ------  ----
A         2400    mm²
Ix        720000  mm⁴
Iy        320000  mm⁴
Zx        24000   mm³
Zy        16000   mm³
r         17.32   mm
```

A = 2400 mm², Ix = 720000 mm⁴, Zx = 24000 mm³, r = 17.32 mm.

Solid circle, 50 mm diameter:

```bash
node dist/cli.js --shape circle --d 50
```

```text
shape: circle
d: 50 mm

property  value     unit
--------  --------  ----
A         1963.50   mm²
Ix        306796.2  mm⁴
Zx        12271.8   mm³
r         12.50     mm
```

A = 1963.50 mm², Ix = 306796.2 mm⁴, Zx = 12271.8 mm³.

Circular tube, 50 mm outside diameter and 40 mm inside diameter:

```bash
node dist/cli.js --shape tube --od 50 --id 40
```

```text
shape: tube
od: 50 mm
id: 40 mm

property  value     unit
--------  --------  ----
A         706.86    mm²
Ix        181132.5  mm⁴
Zx        7245.3    mm³
r         16.01     mm
```

A = 706.86 mm², Ix = 181132.5 mm⁴, Zx = 7245.3 mm³.

Hollow rectangle, 60 mm by 80 mm, with a uniform 5 mm wall, and a 1000 N·m moment:

```bash
node dist/cli.js --shape hollow-rect --b 60 --h 80 --t 5 --moment 1000
```

```text
shape: hollow-rect
b: 60 mm
h: 80 mm
t: 5 mm
moment: 1000 N·m

property  value      unit
--------  ---------  ----
A         1300       mm²
Ix        1130833.3  mm⁴
Iy        710833.3   mm⁴
Zx        28270.8    mm³
Zy        23694.4    mm³
r         29.49      mm
sigma     35.37      MPa
```

A = 1300 mm², Ix = 1130833.3 mm⁴, Zx = 28270.8 mm³, sigma = 35.37 MPa.

JSON for the same rectangle:

```bash
node dist/cli.js --shape rect --b 40 --h 60 --json
```

```json
{
  "shape": "rect",
  "b": 40,
  "h": 60,
  "A": 2400,
  "Ix": 720000,
  "Iy": 320000,
  "Zx": 24000,
  "Zy": 16000,
  "r": 17.320508075688775
}
```

An inner diameter that is not smaller than the outer diameter exits 1 and writes to stderr:

```bash
node dist/cli.js --shape tube --od 40 --id 50
```

```text
error: id must be less than od
```

## Formulas

Rectangle (`b` width, `h` height):

- A = b h
- Ix = b h³ / 12
- Iy = h b³ / 12
- Zx = Ix / (h / 2)
- Zy = Iy / (b / 2)
- r = sqrt(Ix / A)

Circle (`d` diameter):

- A = π d² / 4
- Ix = π d⁴ / 64
- Zx = Ix / (d / 2)
- r = sqrt(Ix / A)

Circular tube (`od` outer diameter, `id` inner diameter):

- A = π (od² − id²) / 4
- Ix = π (od⁴ − id⁴) / 64
- Zx = Ix / (od / 2)
- r = sqrt(Ix / A)

Hollow rectangle with a uniform wall `t`. The inner size is `bi = b − 2t`, `hi = h − 2t`:

- A = b h − bi hi
- Ix = (b h³ − bi hi³) / 12
- Iy = (h b³ − hi bi³) / 12
- Zx = Ix / (h / 2)
- Zy = Iy / (b / 2)
- r = sqrt(Ix / A)

## Validation

Every dimension and `--moment` must be a finite number greater than zero. A tube requires `id < od`. A hollow rectangle requires `2t < b` and `2t < h`. Unknown flags and dimensions that do not belong to the chosen shape are rejected. Failures print `error: ...` on stderr and exit 1.

These are elastic section properties about the centroid, not a member design check.

## License

MIT, Copyright (c) 2026 shanguoao2026-web. See [LICENSE](LICENSE).
