# UI/UX Specification — Reve-Inspired AI Image Generation & Visual Editing Platform

**Version:** 1.0  
**Author:** Design Systems / Senior UI/UX  
**Last Updated:** 2026-11-17  
**Status:** Final Draft

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Design System](#2-design-system)
3. [Layout System](#3-layout-system)
4. [Screen Specifications](#4-screen-specifications)
5. [User Journeys](#5-user-journeys)
6. [Responsive Behavior](#6-responsive-behavior)
7. [Loading and Error States](#7-loading-and-error-states)
8. [Interaction Specifications](#8-interaction-specifications)
9. [Keyboard Shortcuts](#9-keyboard-shortcuts)
10. [Accessibility](#10-accessibility)

---

## 1. Design Philosophy

The platform is a **professional creative tool** built for practitioners who demand precision, speed, and aesthetic quality in equal measure. The visual language draws from three canonical references:

- **Midjourney's simplicity** — a prompt-first interface that gets out of the way and surfaces results without clutter.
- **Figma's precision** — numeric input fields, exact pixel values, inspector panels, and canvas-first thinking.
- **Linear's polish** — micro-interactions, typographic clarity, keyboard-first workflows, and a cohesive dark system that feels alive but never decorative.

**Principles:**

1. **Dark-first, always.** The only theme is dark. Light mode is not planned. Dark canvas backgrounds reduce eye fatigue during long creative sessions and make image content the focus.
2. **Content is the UI.** Generated images, canvas layers, and reference images are the primary visual elements. Chrome shrinks to let content breathe.
3. **Progressive disclosure.** Advanced controls (CFG, scheduler, inpainting strength) are available but not foregrounded. Sensible defaults hide complexity from new users while letting experts reach in.
4. **Speed signals.** Every action has an immediate visual response within 100ms even if the actual operation takes longer. Loading skeletons, optimistic UI updates, and progress indicators are non-negotiable.
5. **Keyboard-first, mouse-compatible.** Power users drive the entire workflow from keyboard. Mouse interaction is fully supported and equally pleasant.
6. **Zero empty states.** Every empty state has a clear call-to-action and illustration. Users are never stranded.

---

## 2. Design System

### 2.1 Color Palette (Dark-First)

#### Background Scale

| Token | Hex | Usage |
|---|---|---|
| `color-bg-deepest` | `#0A0A0B` | App shell background, outermost container |
| `color-bg-surface` | `#111113` | Primary panel backgrounds (sidebar, right panel) |
| `color-bg-elevated` | `#1A1A1E` | Cards, dropdowns, modals, tooltips |
| `color-bg-border` | `#25252A` | Borders, dividers, input outlines |

#### Accent / Brand Scale

| Token | Hex | Usage |
|---|---|---|
| `color-accent-primary` | `#7C5CFC` | Primary buttons, focus rings, active nav items, progress fill |
| `color-accent-hover` | `#9B7FFF` | Button hover, link hover, active element hover |
| `color-accent-pressed` | `#5B3FD4` | Button active/pressed state |
| `color-accent-subtle` | `#7C5CFC1A` | Accent tinted backgrounds (selected rows, highlighted areas) |

#### Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `color-success` | `#22C55E` | Success toasts, completed generation badge |
| `color-success-subtle` | `#22C55E1A` | Success background tint |
| `color-error` | `#EF4444` | Error states, destructive actions, failed badge |
| `color-error-subtle` | `#EF44441A` | Error background tint |
| `color-warning` | `#F59E0B` | Warnings, usage nearing limit |
| `color-warning-subtle` | `#F59E0B1A` | Warning background tint |
| `color-info` | `#3B82F6` | Informational tooltips, model info pill |

#### Text Scale

| Token | Hex | Usage |
|---|---|---|
| `color-text-primary` | `#FFFFFF` | Primary headings, active labels |
| `color-text-secondary` | `#A1A1AA` | Secondary labels, metadata, descriptions |
| `color-text-muted` | `#71717A` | Placeholders, timestamps, helper text |
| `color-text-disabled` | `#3F3F46` | Disabled inputs, greyed-out controls |

---

### 2.2 Typography

**Font Families:**
- **UI:** `Inter` — imported via Google Fonts or bundled. Used for all interface text.
- **Code/Monospace:** `JetBrains Mono` — used for seed values, generation IDs, API keys, model identifiers.

**Type Scale:**

| Token | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `text-xs` | 10px | 16px | 400 | Fine print, debug info |
| `text-sm` | 12px | 18px | 400/500 | Metadata, badges, tooltips |
| `text-base` | 14px | 22px | 400 | Body text, panel labels, form inputs |
| `text-md` | 16px | 24px | 500 | Section headers, button text |
| `text-lg` | 20px | 28px | 600 | Panel titles, modal headings |
| `text-xl` | 24px | 32px | 700 | Page headings |
| `text-2xl` | 32px | 40px | 700 | Hero headings, landing page |
| `text-3xl` | 48px | 56px | 700 | Hero display text |

**Font Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold).

---

### 2.3 Spacing System

Base unit: **4px**. All spacing values are multiples.

| Token | Value | Common Usage |
|---|---|---|
| `space-1` | 4px | Icon gap, tight inline spacing |
| `space-2` | 8px | Between label and input, button padding vertical |
| `space-3` | 12px | Panel section gap, list item padding |
| `space-4` | 16px | Card padding, form field gap |
| `space-5` | 20px | Panel content padding |
| `space-6` | 24px | Section separation, modal padding |
| `space-8` | 32px | Major section gap |
| `space-10` | 40px | Large spacing between sections |
| `space-12` | 48px | Hero top padding |
| `space-16` | 64px | Landing section separation |
| `space-20` | 80px | Footer spacing |
| `space-24` | 96px | Hero display spacing |

---

### 2.4 Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 4px | Badges, small chips |
| `radius-md` | 8px | Input fields, buttons, dropdowns |
| `radius-lg` | 12px | Cards, panels, modals |
| `radius-xl` | 16px | Large cards, feature highlight panels |
| `radius-2xl` | 24px | Modal containers, overlay sheets |
| `radius-pill` | 9999px | Tag pills, avatar, toggle |

---

### 2.5 Elevation / Shadow System

| Level | Box Shadow | Usage |
|---|---|---|
| Elevation 0 | `none` | Flat elements, inline content |
| Elevation 1 | `0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)` | Cards, input focus |
| Elevation 2 | `0 4px 6px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)` | Dropdowns, popovers |
| Elevation 3 | `0 10px 15px rgba(0,0,0,0.6), 0 4px 6px rgba(0,0,0,0.4)` | Modals, overlays |
| Elevation 4 | `0 25px 50px rgba(0,0,0,0.7), 0 10px 20px rgba(0,0,0,0.5)` | Full-screen overlays, drawers |

---

### 2.6 Animation Presets (Framer Motion)

**Global easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard easing)

| Preset | Duration | Usage |
|---|---|---|
| `micro` | 100ms | Hover states, button press feedback, toggle flip |
| `standard` | 200ms | Panel open/close, dropdown reveal, fade in/out |
| `emphasized` | 350ms | Modal enter/exit, page transitions, canvas zoom |

**Framer Motion Variants (reference):**

```ts
// micro
{ duration: 0.1, ease: [0.4, 0, 0.2, 1] }

// standard
{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }

// emphasized
{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }

// fade-in
initial: { opacity: 0 }, animate: { opacity: 1 }, transition: standard

// slide-up (panel enter)
initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: emphasized
```

---

### 2.7 Component Library

#### Button

| Variant | Background | Text | Border | Hover | Disabled |
|---|---|---|---|---|---|
| Primary | `#7C5CFC` | `#FFFFFF` | none | `#9B7FFF` bg | 40% opacity |
| Secondary | `#1A1A1E` | `#A1A1AA` | `#25252A` 1px | `#25252A` bg, `#FFFFFF` text | 40% opacity |
| Ghost | transparent | `#A1A1AA` | none | `#1A1A1E` bg | 40% opacity |
| Danger | `#EF4444` | `#FFFFFF` | none | `#DC2626` bg | 40% opacity |

Sizes: `sm` (28px h, 12px/8px px/py), `md` (36px h, 16px/10px), `lg` (44px h, 20px/12px).  
Border radius: `radius-md` (8px). Font: `text-base` / 500 weight.  
Loading state: left-aligned 16px spinner replaces icon; text becomes "Generating…".

#### Input / Textarea

- Background: `#111113`
- Border: `1px solid #25252A`; focus: `1px solid #7C5CFC` + `box-shadow: 0 0 0 3px rgba(124,92,252,0.2)`
- Text: `#FFFFFF` (typed), `#71717A` (placeholder)
- Height: 36px (single line), auto-resize for Textarea (min 80px, max 240px)
- Border radius: `radius-md`
- Padding: `12px 16px`
- Font: `text-base`

#### Slider

- Track height: 4px, background: `#25252A`, filled portion: `#7C5CFC`
- Thumb: 16px circle, background: `#FFFFFF`, border: `2px solid #7C5CFC`, shadow Elevation 1
- Label above-left, value display above-right (monospace)

#### Toggle

- Off: track `#25252A`, thumb `#71717A`
- On: track `#7C5CFC`, thumb `#FFFFFF`
- Size: 36px wide × 20px tall, thumb 16px circle
- Transition: `micro` (100ms)

#### Select / Dropdown

- Trigger: same as Input styles, chevron-down icon right-aligned `#71717A`
- Menu: `#1A1A1E` background, `radius-lg` (12px), Elevation 2 shadow
- Option height: 36px, padding `8px 12px`
- Active option: `#7C5CFC1A` background, `#FFFFFF` text
- Hover option: `#25252A` background

#### Modal

- Overlay: `rgba(0,0,0,0.75)` backdrop, blur(4px)
- Container: `#111113` background, `radius-2xl` (24px), Elevation 3
- Max width: 480px (sm), 640px (md), 800px (lg)
- Header: 24px padding, `text-lg` semibold title, X close button top-right
- Body: 24px padding
- Footer: 24px padding, right-aligned button group

#### Tooltip

- Background: `#25252A`, `radius-sm` (4px), `text-sm`, `#FFFFFF`
- Padding: `6px 10px`
- Max width: 240px
- Delay: 400ms show, 100ms hide
- Arrow: 6px triangle matching background

#### Badge

- Sizes: `sm` (20px h), `md` (24px h)
- Variants: neutral (`#25252A` bg, `#A1A1AA` text), success, error, warning, info (semantic colors)
- Font: `text-sm` / 500, padding `4px 8px`, `radius-pill`

#### Card

- Background: `#111113`
- Border: `1px solid #25252A`
- Border radius: `radius-lg` (12px)
- Hover: border `#3F3F46`, shadow Elevation 1
- Padding: `16px` (default), `24px` (comfortable)

#### Tabs

- Tab height: 36px, padding `0 16px`
- Active: `#FFFFFF` text, `#7C5CFC` 2px bottom border
- Inactive: `#71717A` text, transparent border
- Background: none (inline), `#1A1A1E` (contained variant)

#### Progress

- Track: `#25252A`, 4px height, `radius-pill`
- Fill: `#7C5CFC`, animated left-to-right
- Indeterminate: sliding shimmer animation

---

## 3. Layout System

### 3.1 Generation Workspace Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Left Sidebar 240px  │      Center flex-1       │ Right 320px  │
│                      │                          │              │
│  Logo                │   Image Canvas /          │  Prompt opts │
│  Nav icons           │   Results Grid            │  CFG/Steps   │
│  Project title       │                          │  References   │
│  Model selector      │                          │  Seed/Sched. │
│  Aspect presets      │                          │              │
│                      │                          │              │
├──────────────────────┴──────────────────────────┴──────────────┤
│                    Bottom Bar — 120px fixed                     │
│  [Prompt textarea            ] [Enhance] [Generate ▶]  ◎ 0%   │
└────────────────────────────────────────────────────────────────┘
```

| Region | Width/Height | Bg Color | Scroll |
|---|---|---|---|
| Left Sidebar | 240px fixed | `#111113` | Overflow-y scroll (hidden bar) |
| Center Canvas | flex-1 | `#0A0A0B` | Overflow auto |
| Right Panel | 320px fixed | `#111113` | Overflow-y scroll |
| Bottom Bar | 100% × 120px | `#111113`, top border `#25252A` | None |

### 3.2 Image Editing Workspace Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Top Bar — 48px: [filename] [undo][redo] [zoom%] [export] [⚙]  │
├────┬────────────────────────────────────────────┬───────────────┤
│ 48 │                                            │  Right 280px  │
│ px │      Konva Canvas — flex-1                 │  Layers panel │
│    │                                            │  ─────────    │
│ T  │                                            │  Properties   │
│ O  │   [AI bar: "Describe your edit..." Apply]  │  panel        │
│ O  │                                            │               │
│ L  │                                            │               │
│ S  │                                            │               │
└────┴────────────────────────────────────────────┴───────────────┘
```

| Region | Width/Height | Bg Color |
|---|---|---|
| Top Bar | 100% × 48px | `#111113`, bottom border `#25252A` |
| Left Toolbar | 48px × flex-1 | `#111113`, right border `#25252A` |
| Canvas Area | flex-1 | `#0A0A0B` |
| Right Panel | 280px | `#111113`, left border `#25252A` |

---

## 4. Screen Specifications

### 4a. Landing Page

**URL:** `/`  
**Purpose:** Marketing, conversion, feature showcase.

**Layout:** Full-width, single-column sections. Nav fixed 64px. Hero section `min-height: 100vh`.

**Navigation Bar (64px):**
- Left: Logo (28px mark + "Reve" wordmark, `text-lg` semibold, `#FFFFFF`)
- Right: Ghost "Sign In" button + Primary "Get Started" button (8px gap)
- Background: `#0A0A0B` with `border-bottom: 1px solid #25252A`, `backdrop-filter: blur(12px)`

**Hero Section:**
- Background: `#0A0A0B` with radial gradient `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,92,252,0.15) 0%, transparent 60%)`
- Headline: `text-3xl` (48px) bold, `#FFFFFF`, max-width 720px, centered
- Subheadline: `text-lg` (20px), `#A1A1AA`, max-width 560px, centered, 16px top margin
- CTA row: Primary "Start Creating" (lg size) + Secondary "Watch Demo" (lg size), 16px gap
- Hero image: Animated 3-column grid of generated images (1200px wide, 480px tall), 48px top margin. Images cycle in with `emphasized` fade animation every 3s. Live prompt ticker below shows example prompts.

**Feature Highlights (3-column grid, 80px top margin):**
- Each column: 32px icon (accent purple), `text-md` title (semibold), `text-sm` body (secondary color)
- Features: Pixel-perfect generation / Multi-reference composition / Structured layer editing

**Pricing CTA:** Dark card (`#111113` bg, `#25252A` border), centered, 80px section.

---

### 4b. Authentication Pages

**URL:** `/sign-in`, `/sign-up`, `/forgot-password`  
**Layout:** Full-screen `#0A0A0B` background, centered card.

**Card:** `#111113` bg, `radius-2xl` (24px), Elevation 2 shadow, 440px max-width, 48px padding.

**Sign-In Card:**
- Logo centered, 24px bottom margin
- `text-xl` heading "Welcome back"
- `text-sm` secondary "New here? [Sign up]" link (purple, underline)
- Google OAuth button (secondary variant, full-width, Google logo left-icon, 44px height)
- Divider: `1px solid #25252A` with "or" text in center (`text-sm` muted)
- Email input (full-width, 36px height)
- Password input (with show/hide eye icon toggle, right-inset)
- "Forgot password?" ghost link right-aligned, `text-sm`
- Primary "Sign In" button (full-width, 44px height)

**Sign-Up Card:** Same card, adds name input, confirm password input, terms checkbox.

**Forgot Password Card:** Email input + "Send reset link" button. Success state shows confirmation illustration.

---

### 4c. Dashboard

**URL:** `/dashboard`  
**Layout:** Full app shell. Left sidebar 240px + main content area.

**Left Sidebar:**
- Top: Logo + app name
- Nav items (40px height each, 8px padding, `radius-md`): Dashboard, Generate, Editor, History, Settings
- Active: `#7C5CFC1A` bg, `#7C5CFC` left-border 2px, `#FFFFFF` text
- Inactive: transparent, `#71717A` text; hover `#1A1A1E` bg
- Bottom: Avatar + username + plan badge

**Main Content (padding: 32px):**
- **Header row:** "My Projects" `text-xl` bold + "New Project" primary button (right)
- **Search + filter bar (24px below):** 320px search input (magnifier icon left), "Filter" ghost button, "Sort" ghost button with dropdown
- **Recent Generations Strip (40px below header):**
  - Label: "Recent" `text-sm` semibold, secondary color
  - Horizontal scroll strip: 160px × 120px image thumbnails, 8px gap, `radius-md`. Hover shows prompt excerpt tooltip.
- **Project Grid (masonry, 24px below strip):**
  - 3-column masonry grid at 1440px. 16px gap.
  - Project Card: image cover (variable height, `radius-lg`), 12px padding below — project name `text-base` semibold, last edited `text-sm` muted, generation count badge
- **Usage Indicator (bottom of sidebar):** Mini progress bar + "X of Y generations used" text, `text-sm`

---

### 4d. Generation Workspace

**URL:** `/generate` or `/project/:id/generate`

#### Left Sidebar (240px)

- **Logo area:** 48px height, logo + wordmark, `border-bottom: 1px solid #25252A`
- **Nav icons + labels (40px each):** Dashboard, Generate (active), Edit, History, Settings. Active state: `#7C5CFC` icon color, `#7C5CFC1A` bg.
- **Project title:** Editable inline text field, `text-sm`, `#A1A1AA`, pencil-icon on hover.
- **Model Selector (16px top margin):**
  - Label: "Model" `text-xs` muted, uppercase tracked
  - Full-width Select dropdown (`text-sm`): lists available models (e.g. FLUX.1-dev, SDXL, etc.)
  - Selected model shows colored dot + name + version badge
- **Aspect Ratio Presets (16px top margin):**
  - Label: "Aspect Ratio" `text-xs` muted
  - 2×3 grid of ratio buttons (1:1, 4:3, 3:4, 16:9, 9:16, Custom). Active: `#7C5CFC1A` bg, `#7C5CFC` border.
  - Each button: ratio icon (small proportional rectangle) + ratio text `text-xs`

#### Center Canvas Area (flex-1, `#0A0A0B` bg)

- **Empty state (no generation yet):**
  - Centered column: 64px abstract illustration (purple tones), "Describe your vision" `text-md`, "Enter a prompt below and click Generate" `text-sm` muted, "Try an example" ghost link
- **Loading state:**
  - Responsive grid of shimmer skeleton cards matching output count
  - Progress bar beneath each skeleton (purple fill, animated)
  - Overall progress indicator bottom-center: "Generating… 47%" `text-sm`
- **Results grid:**
  - Responsive grid: 2 columns at 1280px, 3 at 1440px, 4 at 1920px
  - Image card: `radius-lg`, `overflow: hidden`; hover overlay shows action icons (Open in Editor, Download, Copy Seed, Favorite)
  - Selected image: 2px `#7C5CFC` border ring
- **Single image view:** Click expands to full canvas area; metadata strip below (prompt excerpt, model, seed `JetBrains Mono`, timestamp)

#### Right Panel (320px)

- **Panel tabs:** "Settings" | "References" (Tabs component, full-width)

**Settings Tab:**
- Prompt Enhancement Toggle (`text-sm` label "Enhance prompt", `#A1A1AA`, toggle right-aligned)
- Negative Prompt section: collapsed by default, expand chevron. When open: Textarea (80px min-height).
- **Generation Parameters:**
  - Seed: label + Input (JetBrains Mono, 36px height) + "🎲 Random" ghost button
  - CFG Scale: Slider 1–20, default 7.5. Value pill right.
  - Steps: Slider 10–50, default 28.
  - Scheduler: Select dropdown (DPM++, Euler a, DDIM, etc.)
  - Resolution: Select (512×512, 768×768, 1024×1024, 1024×1536, etc.)
  - Variations: segmented control 1 / 2 / 4

**References Tab (see §4g for full spec).**

#### Bottom Bar (120px, full-width)

- Padding: 16px 24px
- **Prompt textarea:** `flex-1`, auto-resize (min 2 rows), `text-base`, max 4096 chars. Placeholder "Describe your image…". Char counter `text-xs` muted bottom-right. Ctrl+Enter hint `text-xs` muted bottom-left. `@mention` autocomplete for reference labels (↓ auto-suggest panel 240px wide, 8px above cursor).
- **Button group (right, 8px gap):**
  - "Enhance" ghost button (24px icon + label) — sends prompt to LLM for enhancement
  - "Generate" primary button (lg size, 44px height, `#7C5CFC`). Loading state: spinner + "Generating…" text. Disabled while generating.
- **Progress row (below buttons, 8px top margin):** `0px` height when idle; expands to show `ProgressBar` component with percentage label when generating.

---

### 4e. Image Editing Workspace

**URL:** `/project/:id/edit`

#### Top Bar (48px)

- Left: Back arrow (`/generate`), File name (editable inline, `text-base`, `#FFFFFF`)
- Center: Undo button (Ctrl+Z), Redo button (Ctrl+Shift+Z), divider
- Right: Zoom select (25%/50%/75%/100%/150%/200%/Fit), Export button (primary, sm size), "⚙" Settings ghost icon

#### Left Toolbar (48px wide)

Vertical stack of icon-only tool buttons (40px × 40px each, 4px gap):

| Icon | Tool | Shortcut |
|---|---|---|
| Cursor arrow | Select / Pointer | `V` |
| Lasso | Lasso select | `L` |
| Brush circle | Brush (AI mask) | `B` |
| Eraser | Eraser | `E` |
| Rectangle | Shape tool | `S` |
| `T` | Text tool | `T` |
| Hand | Pan / Hand | `H` or Space |

Active tool: `#7C5CFC1A` bg, `#7C5CFC` border-left 2px.  
Brush tool shows sub-toolbar above canvas (floating bar): Size slider (1–200px) + Hardness slider (0–100%).

#### Canvas Area

- Background: `#0A0A0B` with 20px grid dots `#1A1A1E` (togglable via View menu)
- Ruler (optional, 20px wide, top + left): `#111113` bg, tick marks `#25252A`
- **Konva Stage:** Fills remaining canvas area. Layers render in z-index order.
- **AI Floating Bar (bottom center, 24px above bottom edge):**
  - Container: `#1A1A1E` bg, `radius-lg`, Elevation 2, 480px wide
  - Input: "Describe your edit…" placeholder, `text-base`, `flex-1`
  - "Inpaint" toggle badge (pill, toggles brush mask mode on)
  - "Apply" primary button sm

#### Right Panel (280px)

Split vertically 50/50 by a draggable divider (minimum each half: 160px).

**Upper: Layer Panel**
- Header: "Layers" `text-sm` semibold + add-layer icon button (right)
- Layer list items (32px height each):
  - Drag handle (dots icon, 16px, `#71717A`)
  - 24px thumbnail (`radius-sm`, border `1px #25252A`)
  - Type icon (raster/text/shape, 14px)
  - Layer name (editable on double-click), `text-sm`
  - Eye icon (visibility toggle)
  - Lock icon (lock toggle)
  - Delete icon (on hover)
- Selected layer: `#7C5CFC1A` bg row
- Drag-reorder: ghost preview at 50% opacity, insertion line `2px #7C5CFC`

**Lower: Properties Panel**
- Header: "Properties" `text-sm` semibold
- **Position:** X / Y number inputs (64px wide each), `text-sm`, `JetBrains Mono`
- **Size:** W / H number inputs + lock-aspect icon between
- **Transform:** Rotation input (°) + Flip H/V buttons
- **Appearance:** Opacity slider (0–100%), Blend Mode select dropdown
- **Text layer extras (visible only for text layers):** Font family select, size input, weight toggle, color swatch

---

### 4f. Layer Panel

(Full specification incorporated in §4e Right Panel — Upper section.)

**Additional detail:**
- Layer types shown by icon:
  - Raster layer: image-square icon (`#A1A1AA`)
  - Text layer: `T` icon (`#A1A1AA`)
  - Shape layer: pentagon icon (`#A1A1AA`)
  - Group: folder icon (`#A1A1AA`)
- Thumbnail updates in real-time as edits are applied.
- Max 100 layers (UI shows scroll within panel).
- Right-click context menu: Rename, Duplicate, Merge Down, Delete, Move to Top/Bottom.

---

### 4g. Reference Image Panel

**Located:** Right panel "References" tab in Generation Workspace.

**Upload Area:**
- 240px × 100px dashed border (`#25252A`, `border-radius: radius-lg`, dashes 4px/4px)
- Center: upload cloud icon (32px, `#71717A`) + "Drop images or click to upload" `text-sm` muted
- Accepts: `.jpg`, `.png`, `.webp`. Max file size: 10MB. Max 5 references total.
- Hover: border `#7C5CFC`, bg `#7C5CFC0D`
- Drag-over: border solid `#7C5CFC`, bg `#7C5CFC1A`

**Reference Thumbnail Grid:**
- Vertical list (not grid) for readability.
- Each reference item (96px height, 12px gap):
  - Thumbnail: 72px × 72px, `radius-md`, `object-fit: cover`
  - **Label pill:** `@1`–`@5`, `radius-pill`, `#7C5CFC` bg, `#FFFFFF` text, `text-xs` bold — appears top-left of thumbnail
  - **Role Selector:** Select dropdown (Subject / Style / Composition / Color / Character), `text-xs`, width 140px
  - **Strength Slider:** 0.0–1.0, displayed value `text-xs` mono. Full-width of item.
  - **Remove button:** `×` icon-only ghost button, top-right of thumbnail, 20px × 20px, hover `color-error`
- Reorder: drag handles on left side of each item

**Autocomplete:** When user types `@` in prompt textarea, a 240px dropdown lists active reference labels (`@1`, `@2`, etc.) with their role and thumbnail preview.

---

### 4h. Generation History

**URL:** `/history`

**Layout:** Full-width content area with left sidebar (same as dashboard).

**Filter Bar (32px top margin):**
- Search input (320px, placeholder "Search by prompt…")
- Model filter: Select dropdown
- Date range: Select (Today / This week / This month / All time)
- Sort: Newest first (default), Oldest first

**Infinite Scroll Grid:**
- 4-column grid at 1280px+
- Cell: `radius-lg`, overflow hidden
- Image thumbnail (100% width, aspect-ratio preserved)
- Overlay strip at bottom (gradient black): prompt excerpt `text-sm` truncated, timestamp `text-xs` muted
- Hover overlay: full prompt + action icons (Open in editor, Download, Regenerate, Delete)
- Metadata row below cell: Model badge `text-xs`, Seed `text-xs` mono `#71717A`
- Load more: triggered 200px before scroll end via Intersection Observer

---

### 4i. Project Gallery

**URL:** `/projects`

**Masonry Grid:** 3 columns at 1280px, 4 at 1440px. 20px gap.

**Project Card:**
- Cover image: `radius-lg` top corners (8px), `object-fit: cover`, variable height (min 180px, max 320px)
- Footer: `#111113` bg, `radius-lg` bottom corners, `12px 16px` padding
  - Project name: `text-base` semibold, `#FFFFFF`, truncated at 1 line
  - Last edited: `text-xs` muted (e.g. "Edited 2 hours ago")
  - Generation count: Badge `#25252A` bg, `text-xs`
  - Action overflow (⋯ button): Edit name, Duplicate, Delete options

**New Project Card:**
- Dashed border `#25252A`, same masonry dimensions
- Center: `+` icon (32px, `#71717A`) + "New Project" `text-sm` muted
- Hover: border `#7C5CFC`, bg `#7C5CFC0D`

---

### 4j. Settings Page

**URL:** `/settings`

**Layout:** Left sidebar + main content (divided into sections by `border-bottom: 1px solid #25252A`).

**Sections (each 40px section header `text-md` semibold, 32px top padding):**

1. **Profile** — Avatar upload (64px circle), Display name input, Email (read-only), Change password link
2. **API Keys** — Read-only masked input (last 4 chars visible + `•••••••••`), Copy button, Regenerate button (danger variant with confirm modal)
3. **Usage Statistics** — This month: generation count / limit (progress bar), storage used / limit (progress bar), API calls (if applicable)
4. **Model Preferences** — Default model select, Default CFG input, Default steps input, Default scheduler select
5. **Storage** — List of uploaded assets with sizes, "Clear cache" button
6. **Subscription** — Plan name badge, renewal date, usage breakdown table, "Upgrade Plan" CTA button

---

## 5. User Journeys

### 5a. New User Onboarding → First Generation

1. Land on `/` → click "Get Started" → redirect to `/sign-up`
2. Fill name, email, password → submit → email verification toast shown
3. Redirect to `/dashboard` → Onboarding banner: "Create your first project" with "Start Generating" CTA
4. Click → redirect to `/generate` → empty canvas shown with example prompt pre-filled
5. Click "Generate" → loading skeletons appear → results grid populates (4 images)
6. Hover image → "Open in Editor" button appears → click → redirect to `/project/:id/edit`
7. Onboarding complete; banner dismissed and stored in user preferences.

### 5b. Text-to-Image Generation Workflow

1. Navigate to `/generate`
2. Select model from left sidebar dropdown
3. Choose aspect ratio (e.g. 16:9)
4. Type prompt in bottom bar textarea
5. Optionally adjust CFG (7 → 9), Steps (28 → 35) in right panel
6. Press Ctrl+Enter or click "Generate"
7. Progress bar animates 0% → 100% over inference time
8. Results grid appears with 1–4 images
9. Click image → single view mode; metadata visible
10. "Download" icon → browser download; "Open in Editor" → editing workspace

### 5c. Image-to-Image Transformation Workflow

1. In `/generate`, click "References" tab in right panel
2. Upload source image to reference panel → assigned `@1` label
3. Set role to "Composition" or "Subject"
4. Set strength slider to 0.75
5. Type transformation prompt: "Make it in the style of Japanese woodblock print"
6. Generate → model uses reference as conditioning
7. Result images show stylistic transformation of source

### 5d. Inpainting Workflow

1. Open image in `/project/:id/edit`
2. Select Brush tool (`B`)
3. Paint red mask over region to replace on canvas
4. AI floating bar activates: type "Replace with a wooden door"
5. Click "Apply" → inpaint mode sends mask + prompt to backend
6. Canvas updates with inpainted region blended in; original layers preserved
7. Undo (Ctrl+Z) reverts to pre-inpaint state; undo stack shows "Inpaint" label

### 5e. Multi-Reference Generation Workflow

1. Open `/generate`, click "References" tab
2. Upload 3 reference images: portrait photo (`@1`, Subject), art piece (`@2`, Style), composition sketch (`@3`, Composition)
3. In prompt, type: "Portrait of @1 in the style of @2 with the pose from @3"
4. Set per-reference strength: `@1` → 0.8, `@2` → 0.6, `@3` → 0.5
5. Generate → model blends all three references per their roles and strengths
6. Results show portrait matching persona, style, and composition references

### 5f. Typography Poster Creation Workflow

1. Open `/project/:id/edit`
2. Generate background image via AI prompt (or upload)
3. Click "T" (Text tool) → click on canvas → text layer created
4. Properties panel: set font "Inter", size 72px, weight 700, color `#FFFFFF`
5. Type poster headline
6. Adjust position (X/Y inputs), rotation, opacity in Properties panel
7. Add second text layer for subheadline
8. Use Layer panel to reorder text above raster layer
9. Export: "Export" button top-right → PNG at 2x resolution

### 5g. Layer Editing and Export Workflow

1. In `/project/:id/edit`, canvas has 3 layers (background raster, subject raster, text)
2. In Layer panel, drag subject layer above text layer (drag handle → insertion line appears)
3. Select subject layer → Properties: set Opacity 85%, Blend Mode "Multiply"
4. Toggle eye icon on background → hidden; check composition
5. Toggle back; Ctrl+Z undoes each operation individually
6. Export → modal appears: format (PNG/JPEG/WEBP), resolution (1×, 2×), quality slider (JPEG) → "Export" button → download

---

## 6. Responsive Behavior

**Minimum supported width:** 1280px. No mobile layout for editor or generator. Mobile users are served a **read-only gallery** at `/m/gallery`.

| Breakpoint | Width | Behavior |
|---|---|---|
| Desktop baseline | 1280px | 2-col generation grid, 3-col masonry |
| Comfortable | 1440px | 3-col generation grid, 4-col masonry; right panel expanded to 360px |
| Expanded | 1920px | 4-col generation grid; left sidebar shows labels + icons; center canvas maximized |

**Panel behavior at 1280px:**
- Right panel collapses to icon-only 48px rail by default; click icon to expand as overlay (320px, Elevation 3)
- Bottom bar textarea reduces to 1 row; expands on focus

**Panel behavior at 1440px+:** All three panels always visible. No overlay mode.

**Mobile (< 1024px):**
- Redirect to mobile-only view: simple generation history gallery (read-only), project cards, sign-out. No editing or generation available. Toast: "For the full experience, use a desktop browser."

---

## 7. Loading and Error States

### 7.1 Generation In Progress

- Center canvas replaces empty state with a grid of shimmer skeleton cards
- Each card: `radius-lg`, animated gradient shimmer (`#1A1A1E` → `#25252A` → `#1A1A1E`, 1.5s loop)
- Bottom bar: "Generate" button disabled + spinner; progress bar fills with percentage
- Left sidebar: model selector disabled with tooltip "Generation in progress"
- Cancel button appears next to progress bar after 3 seconds

### 7.2 Generation Failed

- Shimmer cards replaced by error card: `#EF44441A` bg, red dashed border, 24px × 24px alert icon (`#EF4444`)
- Error message `text-sm`: "Generation failed" + sub-message `text-xs` muted (e.g. "Model returned an error. Try again or change settings.")
- "Retry" ghost button (danger variant), "Change model" ghost link
- Toast notification top-right: `#EF4444` left-border, "Generation failed" title, error code `text-xs` mono

### 7.3 Upload In Progress

- Reference panel upload area shows ProgressBar (indeterminate then 0–100%)
- Thumbnail placeholder: shimmer skeleton 72px × 72px
- Percentage label `text-xs` muted below bar
- Cancel (×) button aborts upload via AbortController

### 7.4 Empty States

| Screen | Illustration (px) | Headline | Sub-text | CTA |
|---|---|---|---|---|
| No projects | 80px abstract shape | "Start your first project" | "Generate images, edit layers, and save your work" | "New Project" primary button |
| No history | 80px clock icon | "No generations yet" | "Generated images appear here" | "Start Generating" ghost button |
| No references | 80px image icon | "No references added" | "Drop images to use as references" | — |
| Search no results | 80px magnifier | "No results found" | "Try a different search term" | "Clear search" ghost link |

### 7.5 Network Error Toast

- Position: bottom-right, 320px wide
- Stack: up to 3 toasts, 8px gap, newest on top
- Structure: colored left-border (4px), icon, title `text-base` semibold, message `text-sm` muted, dismiss × button
- Auto-dismiss: success 3s, warning 5s, error 7s (or manual dismiss)
- Entry animation: slide-in-right, `emphasized` (350ms)

### 7.6 Model Unavailable Warning

- Yellow banner beneath top bar: `#F59E0B1A` bg, `border-bottom: 1px solid #F59E0B40`
- Icon: warning triangle `#F59E0B` 16px + message `text-sm` `#F59E0B`: "Selected model is currently unavailable. [Switch model]" link
- Banner is sticky; dismiss via × button

---

## 8. Interaction Specifications

### 8.1 Brush Tool (Inpainting Mask)

- Activated with `B` key or toolbar click
- Cursor: custom circular brush cursor matching current brush size in real-time
- **Drawing:** `mousedown` → begin path; `mousemove` → extend path with quadratic bezier smoothing; `mouseup` → end path and add to mask layer
- Mask rendered as semi-transparent red overlay (RGBA `255, 0, 0, 0.5`) on a dedicated Konva layer above all content layers
- Brush size: 1–200px; Hardness: 0% (soft gaussian falloff) → 100% (hard edge)
- Pressure-insensitive (all pointer events treated as full pressure)
- Eraser mode: same path logic, compositing mode `destination-out` on mask layer
- Mask is pixel-accurate (no anti-aliasing on hard mode); exported as black/white PNG for inpaint API

### 8.2 Drag-and-Drop Layer Reorder

- Drag handle (6-dot icon) triggers `draggable` on the layer row
- During drag: source row becomes ghost at 50% opacity; cursor `grabbing`
- Drag preview: solid copy of row follows cursor at Elevation 3
- Insertion line: `2px solid #7C5CFC` appears between target rows, animated with `micro` (100ms) transition
- Drop: row snaps to new position, layer z-index updates in Zustand store, Konva canvas re-renders
- Undo: registered as single "Reorder layer" operation in undo stack

### 8.3 Prompt Textarea

- Auto-resize: textarea starts at 2 rows; grows to max 6 rows (then scrolls)
- **Ctrl+Enter:** triggers generation; visual ripple on Generate button
- **@ Autocomplete:** when user types `@`, a floating list appears 8px above cursor — shows active reference labels (`@1 (Subject)`, `@2 (Style)`) with 24px thumbnails. Arrow keys navigate, Enter selects, Esc closes.
- Character counter: `4096 max`. Shows `text-xs` counter bottom-right only when > 80% capacity (3277+). Red when at limit.
- Paste: strips formatting, accepts plain text only

### 8.4 Zoom: Canvas

- **Ctrl+Scroll:** zoom in/out centered on cursor position (10% per notch, min 10%, max 800%)
- **Pinch gesture** (touchpad): same behavior as Ctrl+Scroll
- **`+` / `-` keyboard:** zoom 25% increments, centered on canvas center
- **Ctrl+0:** fit canvas to viewport
- **Ctrl+1:** zoom to 100%
- Zoom level displayed in top bar select; manually editable

### 8.5 Undo / Redo

- **Ctrl+Z:** undo last operation; operation name shown in a temporary toast at bottom-left ("Undid: Brush stroke" `text-sm`)
- **Ctrl+Shift+Z:** redo
- Max undo stack depth: 100 operations (oldest dropped)
- Stack persists for the session; cleared on page reload
- Operations tracked: layer add/delete/reorder, property change, brush stroke, inpaint, text edit, transform
- Undo/Redo buttons in top bar show tooltip with operation name on hover

---

## 9. Keyboard Shortcuts

### Generation Workspace

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` | Trigger generation |
| `Ctrl+Z` | Undo (prompt text) |
| `Ctrl+Shift+Z` | Redo (prompt text) |
| `Ctrl+K` | Focus prompt textarea |
| `Ctrl+/` | Toggle right panel |
| `Ctrl+B` | Toggle bottom bar expansion |
| `Escape` | Cancel generation (if in progress) |
| `1`–`4` | Select image 1–4 from results |
| `Ctrl+D` | Download selected image |
| `Ctrl+E` | Open selected image in editor |
| `Ctrl+S` | Save current project |

### Image Editing Workspace

| Shortcut | Action |
|---|---|
| `V` | Pointer / Select tool |
| `L` | Lasso select |
| `B` | Brush (mask) tool |
| `E` | Eraser |
| `S` | Shape tool |
| `T` | Text tool |
| `H` or `Space` | Hand / Pan tool |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+A` | Select all layers |
| `Ctrl+D` | Deselect |
| `Ctrl+G` | Group selected layers |
| `Ctrl+Shift+G` | Ungroup |
| `Ctrl+[` | Move layer down |
| `Ctrl+]` | Move layer up |
| `Ctrl+Shift+[` | Move layer to bottom |
| `Ctrl+Shift+]` | Move layer to top |
| `Ctrl++` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Fit to screen |
| `Ctrl+1` | Zoom to 100% |
| `Ctrl+E` | Export |
| `Ctrl+S` | Save |
| `Delete` / `Backspace` | Delete selected layer |
| `Alt+Drag` | Duplicate layer |
| `Arrow keys` | Nudge position 1px |
| `Shift+Arrow` | Nudge position 10px |
| `F` | Toggle full-screen canvas |
| `Ctrl+Shift+H` | Toggle layer panel |

---

## 10. Accessibility

**Target:** WCAG 2.1 AA compliance.

### 10.1 Color Contrast

| Foreground | Background | Ratio | WCAG AA |
|---|---|---|---|
| `#FFFFFF` | `#0A0A0B` | 20.1:1 | ✅ Pass (AAA) |
| `#A1A1AA` | `#111113` | 5.4:1 | ✅ Pass (AA) |
| `#FFFFFF` | `#7C5CFC` | 4.8:1 | ✅ Pass (AA) |
| `#71717A` | `#111113` | 3.6:1 | ✅ Pass (AA large) |
| `#FFFFFF` | `#EF4444` | 4.5:1 | ✅ Pass (AA) |

Non-text color contrast (UI components, icons): minimum 3:1 against adjacent backgrounds.

### 10.2 Keyboard Navigation

- **Tab order:** logical DOM order. All interactive elements reachable via Tab. Skip navigation link at top of page jumps to main content region.
- **Focus indicators:** `outline: 2px solid #7C5CFC; outline-offset: 2px` on all focusable elements. No `outline: none` without a custom visible replacement.
- Modals trap focus within (`focus-trap-react`). Escape closes modal and returns focus to trigger.
- Dropdowns: Arrow keys navigate options; Enter selects; Escape closes.
- Sliders: Arrow keys adjust value (1 unit); Shift+Arrow (10 units).
- Canvas tools: Tab cycles tool, Space activates.

### 10.3 Screen Reader Support

- **ARIA roles:** `role="main"`, `role="navigation"`, `role="dialog"` (modals), `role="alert"` (toasts), `role="progressbar"` (generation progress with `aria-valuenow`/`aria-valuemax`), `role="listbox"` (dropdowns), `role="tree"` (layer panel)
- **ARIA labels:** All icon-only buttons have `aria-label`. Image thumbnails have `alt` text from prompt excerpt. Toggle switches have `aria-checked`.
- **Live regions:** `aria-live="polite"` on toast container; `aria-live="assertive"` on error messages; generation status updates announced.
- **Image alt text:** Generated images use first 120 chars of prompt as `alt` attribute.

### 10.4 Motion and Reduced Motion

- All animations wrapped in `@media (prefers-reduced-motion: reduce)`: durations drop to 1ms; shimmer replaced by static skeleton; slide transitions replaced by fade.
- Framer Motion: `useReducedMotion()` hook applied globally.

### 10.5 Additional Considerations

- Font sizes: minimum 12px for all visible text. No `px` font-sizes less than 10px anywhere.
- Touch targets: minimum 44px × 44px for all interactive elements (even if visually smaller, padding expands hit area).
- Form validation: errors announced via `aria-describedby` linking input to error message element.
- Language attribute: `<html lang="en">` declared.
- Semantic HTML: `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`, `<section>` used appropriately throughout. No `<div>` for interactive elements that should be `<button>` or `<a>`.

---

*End of UI/UX Specification v1.0*
