# Liquid Glass — an agent skill for real liquid glass on the web

Most "liquid glass" demos on the web are frosted glass with good PR:
`backdrop-filter: blur()` and a translucent gradient. Real liquid glass — the
material Apple ships — is **rendered**: it refracts what's behind it, bends
light only near the rim, fringes colours at the edges, and its highlight
reacts to light in real time.

This repo is that recipe, packaged two ways:

- **An agent skill** (`SKILL.md`) — give it to Claude Code / Codex / any
  skills-aware coding agent, and the agent builds liquid glass correctly
  instead of reaching for blur or, worse, `feTurbulence` funhouse mirrors.
- **A drop-in runtime** (`assets/`) — two files, zero dependencies, for
  humans who just want the material in their own page.

## Demo

The full effect running a real UI — a Three.js night-cabin scene whose dock,
toasts and slider are all liquid glass, including a flash of lightning that
the glass answers:

**→ Live demo: [cxc1344.github.io/night-cabin-liquid-glass](https://cxc1344.github.io/night-cabin-liquid-glass/)** · source: [night-cabin-liquid-glass](https://github.com/cxc1344/night-cabin-liquid-glass)

A minimal standalone demo lives in [`examples/demo.html`](examples/demo.html):
open it, move the pointer, watch the grid bend under the edges of the card.

## Install the skill

```bash
# Claude Code (user level)
git clone https://github.com/cxc1344/liquid-glass-skill ~/.claude/skills/liquid-glass

# or per-project
git clone https://github.com/cxc1344/liquid-glass-skill .claude/skills/liquid-glass
```

Any agent that reads `SKILL.md` files can use it the same way.

## Use the runtime directly

```html
<link rel="stylesheet" href="assets/liquid-glass.css">

<div class="lg lg-capsule">…</div>

<script src="assets/liquid-glass.js"></script>
```

Every element with class `lg` (or a `data-lg` attribute) gets:

1. A displacement map generated at runtime from its own rounded-rect SDF —
   neutral centre, bending rim band.
2. RGB-split displacement (scales 60 / 54 / 48, screen blend) — that's the
   chromatic dispersion on the edges.
3. A specular sheen + dispersion rim driven by pointer / device tilt, with a
   gentle idle sway, plus an optional scene-flash hook
   (`[data-lg-flash]` element, or `LiquidGlass.setFlash(0..1)`).

## Browser support

Chromium and Safari apply SVG filters inside `backdrop-filter`, so they get
the full refraction. Firefox falls back to the frosted layer — still clean,
never broken.

## How it works

The short version is in [`SKILL.md`](SKILL.md) — written for agents, perfectly
readable for humans: the SDF map math, the channel-split filter chain, the
specular driver, the tuning knobs, and the two anti-patterns to avoid.

---

## 中文说明

这是一个把「真·液态玻璃」做成 Agent Skill 的开源项目。市面上的网页版
液态玻璃大多只是毛玻璃（高斯模糊）冒充的；真正的液态玻璃要实时折射背景、
只在边缘弯曲光线、带 RGB 色散和高光反应。这个仓库里包含：

- `SKILL.md`：给编程 Agent 看的技能包，装上之后它做液态玻璃就不会再拿
  模糊或者哈哈镜式的湍流位移糊弄你；
- `assets/`：给人直接用的零依赖运行时，两个文件，引进去给元素加个
  `lg` 类就行；
- 完整实景演示见姊妹仓库
  [night-cabin-liquid-glass](https://github.com/cxc1344/night-cabin-liquid-glass)
  （林间夜屋的整套 UI 都是这块玻璃）。

## License

MIT — see [LICENSE](LICENSE).

Built by [cxc1344](https://github.com/cxc1344) with Muse (syzsg).
