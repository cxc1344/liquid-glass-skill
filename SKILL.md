---
name: liquid-glass
description: Build real liquid-glass UI for the web — runtime SDF displacement refraction, RGB channel dispersion, and light-reactive specular, with a frosted fallback. Use when the user asks for liquid glass, glassmorphism with real refraction, an Apple-style glass dock/panel/card, or says frosted blur "doesn't look like glass".
---

# Liquid Glass

Real liquid glass is **rendered**, not blurred. It refracts what is behind the
element (bending light near the rim, staying neutral in the middle), splits
that refraction slightly per colour channel so the edges fringe, and carries a
specular highlight that reacts to light and movement in real time. If a design
only uses `backdrop-filter: blur()` it is frosted glass — fine as a fallback,
but do not ship it and call it liquid glass.

## The two anti-patterns (never ship these)

1. **`feTurbulence` displacement as the refraction.** Noise-based displacement
   warps the whole surface like a funhouse mirror. Real glass keeps the centre
   flat; only a band near the edge bends.
2. **Blur + translucent white and nothing else.** That is frosted glass. It is
   this skill's *fallback layer*, not the effect.

## The recipe

1. **Displacement map from an SDF.** For each glass element, generate a map at
   runtime on a canvas, sized to the element: evaluate the rounded-rectangle
   signed distance field per pixel; inside a rim band (width
   `max(14px, 0.34 × min(w, h))`) push the map value along the negative SDF
   gradient with falloff `pow(1 − depth/band, 1.6) × 0.92`; everywhere else
   write neutral `(128, 128)`.
2. **RGB-split displacement.** An SVG filter splits `SourceGraphic` into R, G,
   B with `feColorMatrix`, displaces each channel with the same map at scales
   **60 / 54 / 48**, and recombines with `feBlend mode="screen"`. The 12%
   scale spread is the chromatic dispersion — do not use one scale for all
   three channels, that is plain refraction with no glass character.
3. **Enable only when the map exists.** Set the element's `--lg-filter` and
   add `.lg-on` after its map loads, so users never see a half-applied filter.
   Rebuild maps on resize (debounce ~180 ms).
4. **Live specular.** Track pointer position (and `deviceorientation` on
   mobile), smooth it (lerp ≈ 0.06/frame) plus a slow idle sway, and expose
   `--lg-tx`, `--lg-ty`, `--lg-bx`, `--lg-ang` on `:root`. The sheen layer
   (`::after`, screen blend) positions itself from those variables; the rim
   (`::before`, conic gradient, masked to the border ring) rotates with
   `--lg-ang`.
5. **Answer the scene.** Optionally observe a flashing overlay element
   (`[data-lg-flash]`) or call `LiquidGlass.setFlash(v)` so lightning, camera
   flashes, or notifications briefly brighten rim and sheen via `--lg-flash`.

## Integration

Copy `assets/liquid-glass.css` and `assets/liquid-glass.js` from this skill
into the project, then:

```html
<link rel="stylesheet" href="liquid-glass.css">
<div class="lg lg-capsule">…</div>
<script src="liquid-glass.js"></script>
```

- Any element with class `lg` (or a `data-lg` attribute) is enhanced.
- Capsules (`border-radius: 999px`) are the natural shape; the runtime reads
  the computed radius and clamps it to half the height, so ordinary rounded
  rectangles work too.
- Use real rendered icons (inline SVG strokes) inside glass controls, not
  emoji — emoji render inconsistently and cheapen the material.
- Keep text contrast: the centre of the map is neutral by design, so text
  stays readable; do not add extra tint opacity "for readability".

## Parameters worth tuning

| Knob | Default | Effect |
|---|---|---|
| Channel scales | 60 / 54 / 48 | Bigger spread = stronger colour fringing |
| Rim band | `max(14, 0.34 × min(w,h))` | Wider band = softer, deeper bend |
| Falloff | `pow(1 − t, 1.6)` | Higher exponent = bend hugs the edge tighter |
| Smoothing | 0.06 / frame | Lower = dreamier, laggier highlight |

## Browser behaviour

- Chromium and Safari apply SVG filters in `backdrop-filter` → full effect.
- Firefox currently falls back to the frosted layer. That is expected and
  acceptable; never remove the fallback to "force" the effect.

## Verify before delivering

- [ ] Grid lines / text behind the element bend **only** near the rim; the
      middle is undistorted.
- [ ] A faint RGB fringe is visible on high-contrast edges.
- [ ] The highlight moves when the pointer moves or the device tilts, and
      drifts gently when idle.
- [ ] Resizing the window keeps the refraction aligned (maps rebuilt).
- [ ] With JS disabled the element still looks like clean frosted glass.
