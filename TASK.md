# section-properties-calc

Build a small TypeScript Node CLI (Node 18+, no runtime deps; devDeps typescript + @types/node only; tests with node:test) that computes cross-section properties for common beam sections (mm units).

Features:
- Shapes: --shape rect --b B --h H; --shape circle --d D; --shape tube --od D --id d; --shape hollow-rect --b B --h H --t T (uniform wall).
- Outputs: area A (mm²), second moment about the horizontal centroidal axis Ix (mm⁴), elastic section modulus Zx = Ix/c (mm³), radius of gyration r = sqrt(I/A) (mm). For rect/hollow-rect also Iy and Zy.
- Optional --moment M (N·m) → max bending stress σ = M·1000/Zx (MPa).
- Validate finite positive numbers, id < od, 2t < b and 2t < h; errors to stderr with exit 1.
- Table output by default, --json, --help. README with examples, MIT LICENSE (author shanguoao2026-web), .gitignore with node_modules/ dist/ *.log.
- npm test must build and pass. No secrets, no personal info.

Check values (must be in tests):
- rect b40 h60 → A 2400, Ix 720000, Zx 24000, r 17.32.
- circle d50 → A 1963.50, I 306796.2, Z 12271.8.
- tube od50 id40 → A 706.86, I 181132.5, Z 7245.3.
- hollow-rect b60 h80 t5 → A 1300, Ix 1130833.3, Zx 28270.8; with --moment 1000 → σ 35.37 MPa.
- tube od40 id50 → exit 1.
