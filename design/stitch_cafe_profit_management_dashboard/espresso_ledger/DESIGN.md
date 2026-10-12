---
name: Espresso Ledger
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#504440'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#827470'
  outline-variant: '#d3c3be'
  surface-tint: '#74584e'
  primary: '#090100'
  on-primary: '#ffffff'
  primary-container: '#2c1810'
  on-primary-container: '#9e7e73'
  inverse-primary: '#e3bfb2'
  secondary: '#9b4500'
  on-secondary: '#ffffff'
  secondary-container: '#fd8a42'
  on-secondary-container: '#682c00'
  tertiary: '#000308'
  on-tertiary: '#ffffff'
  tertiary-container: '#001f34'
  on-tertiary-container: '#1b8ccf'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#e3bfb2'
  on-primary-fixed: '#2a170f'
  on-primary-fixed-variant: '#5a4137'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb68e'
  on-secondary-fixed: '#331200'
  on-secondary-fixed-variant: '#763300'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  data-metric:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  data-table:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes a high-precision, utilitarian operational environment engineered specifically for café managers, franchise operators, and baristas overseeing prep logistics and unit economics. The aesthetic merges the tactile warmth of artisanal specialty coffee with the structured discipline of modern enterprise fintech dashboards.

The visual tone is pragmatic, disciplined, and calm under high-pressure shift operations. Rather than generic corporate blues, the system utilizes rich roasted espresso tones anchored by warm amber accents, balancing food & beverage identity with financial seriousness. High-density data displays prioritize immediate scanning, low visual fatigue during prolonged inventory stocktakes, and zero-ambiguity status differentiation between verified actuals, tentative forecasts, and urgent stock shortages.

## Colors

The palette is anchored by `#2C1810` (Deep Roasted Espresso) for prominent navigation anchors, primary action states, and high-contrast structural framing. Secondary `#B45309` (Warm Amber Caramel) provides emphasis for financial estimations, warnings, and active operational states without creating false emergencies. `#0284C7` (Cyan Sky) operates as the dedicated tertiary hue for packaging channels, fulfillment dispatches, and cold-chain inventory tags.

### Surfaces & Structure
- **Canvas Background**: `#F8FAFC` provides a crisp, cool-tinted off-white foundation reducing glare.
- **Card & Cell Surface**: `#FFFFFF` pure white, offering maximum contrast for dense data rows and metrics.
- **Subtle Surface Container**: `#F1F5F9` for table headers, disabled states, and segmented toggle tracks.
- **Structural Borders**: `#E2E8F0` for general dividers; `#CBD5E1` for active form controls and high-contrast column separators.

### Semantic Status System
- **Verified Actuals (Settled / In-Stock)**: `#059669` (Emerald 600) text on `#ECFDF5` background.
- **Tentative / Forecast / Pending**: `#D97706` (Amber 600) text on `#FFFBEB` background, or `#4F46E5` (Indigo 600) text on `#EEF2FF` for predictive modeling.
- **Shortage / Urgent Warning / Negative Variance**: `#DC2626` (Rose Crimson 600) text on `#FEF2F2` background with `#FCA5A5` border.
- **Packaging / Channel Tags**: `#0284C7` (Sky 600) text on `#F0F9FF` background.

## Typography

The typography system relies on `Inter` with Korean fallback support (Pretendard / Apple SD Gothic Neo) for dense UI readability, accompanied by `JetBrains Mono` for batch codes, SKUs, and raw inventory counts.

### Tabular Numerics
All numerical representations—including currency (`₩`, `KRW`), weights (`g`, `kg`), volumes (`ml`, `L`), and unit counts (`개`, `pk`)—must strictly enforce OpenType tabular figures (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1`). This ensures flawless vertical alignment down dense ledger columns.

### Scale Rules
- Primary dashboard headlines adapt to device constraints: `headline-xl` drops to `headline-lg` under tablet breakpoints (< 1024px).
- In tabular grids, `data-table` at 13px provides optimal density while meeting legibility thresholds under low ambient cafe lighting.
- Monospaced annotations (`data-mono`) are reserved for barcode IDs, recipe ratios (e.g., `1:2.25`), and precise unit conversions.

## Layout & Spacing

The layout is built around a compact, fluid 12-column grid optimized for 1440px desktop workstations with responsive scaling down to mobile POS terminals (390px). 

### Layout Philosophy
Data density is prioritized over excessive blank space. Table cell vertical padding is held to strict vertical rhythms (`space-sm` for compact ledger rows, `space-md` for standard views). Column gutters shrink to `0.5rem` (`gutter-compact`) inside complex filter ribbons and modal dialogs.

### Breakpoints & Adaptive Rules
- **Desktop (≥ 1280px)**: 12 columns, 24px outer margin (`space-xl`), full dual-pane view (master operational list on left, detail prep card or recipe breakdown on right).
- **Tablet / POS Screen (768px – 1279px)**: 8 columns, 16px outer margin (`space-lg`), collapsible sidebar navigation into icon rail, horizontal scrolling on dense inventory tables.
- **Mobile (≤ 767px)**: 4 columns, 16px outer margin (`margin-mobile`), data tables collapse into stacked cards with sticky action bars at the bottom viewport.

## Elevation & Depth

Visual hierarchy relies on structural border delineation and clean planar shifts rather than heavy dropshadows, ensuring crisp rendering across budget POS terminals and monitors.

### Hierarchy Tiers
- **Level 0 (Flat Ground)**: Base background `#F8FAFC`. Table headers `#F1F5F9`. No shadows.
- **Level 1 (Surface Cards & Grids)**: Background `#FFFFFF`, bordered by 1px solid `#E2E8F0`. Shadow: `0 1px 2px 0 rgba(44, 24, 16, 0.04)`.
- **Level 2 (Popovers, Select Menus, Tooltips)**: Background `#FFFFFF`, bordered by 1px solid `#CBD5E1`. Shadow: `0 4px 6px -1px rgba(44, 24, 16, 0.08), 0 2px 4px -2px rgba(44, 24, 16, 0.04)`.
- **Level 3 (Modals & Slide-over Sheets)**: Background `#FFFFFF`, bordered by 1px solid `#CBD5E1`. Shadow: `0 20px 25px -5px rgba(44, 24, 16, 0.12), 0 8px 10px -6px rgba(44, 24, 16, 0.06)`. Backdropped by a frosted overlay: `rgba(44, 24, 16, 0.45)` with `backdrop-filter: blur(4px)`.

## Shapes

The design system employs a soft, precision-oriented shape grammar (`roundedness: 1`), conveying engineering rigor rather than playful softness:

- **Base Radius (`0.25rem` / 4px)**: Standard form inputs, unit suffix badges, segmented control items, data table rows, and status tags.
- **Container Radius (`0.5rem` / 8px)**: Summary KPI metric cards, data table wrappers, modal panels, and alert banners.
- **Large Radius (`0.75rem` / 12px)**: Root modal overlays, major operational summary panels, and floating toast stacks.
- **Pill Shape (`9999px`)**: Strictly reserved for circular status indicators, counter badges, and fulfillment channel chips.

## Components

### Buttons
- **Primary**: Background `#2C1810`, text `#FFFFFF`, 4px border radius. Hover state transitions to `#3A2312`. Active state scale `0.98`. Focus ring: 2px offset with `#B45309`.
- **Secondary**: Background `#FFFFFF`, text `#2C1810`, border 1px solid `#CBD5E1`. Hover: `#F8FAFC` and border `#94A3B8`.
- **Destructive**: Background `#DC2626`, text `#FFFFFF`. Hover: `#B91C1C`.
- **Tertiary / Ghost**: Text `#64748B`, transparent background. Hover: `#F1F5F9`, text `#2C1810`.

### Status Badges & Chips
Status pills communicate real-time inventory reality:
- **실제 실적 (Verified Actuals)**: `#059669` text, `#ECFDF5` background, `#A7F3D0` border. Prefixed with a solid 6px emerald dot.
- **예상치 (Estimated / Tentative)**: `#D97706` text, `#FFFBEB` background, `#FDE68A` border. Prefixed with a dashed outline dot.
- **부족 경고 (Shortage Warning)**: `#DC2626` text, `#FEF2F2` background, `#FECACA` border. Accompanied by a bold warning triangle icon.
- **Channel Segment Tags**: For `매장` (Dine-in / Store) use neutral slate badge (`#F1F5F9` / `#475569`); for `포장` (Takeout / Delivery) use sky badge (`#F0F9FF` / `#0284C7`).

### Data Tables
Tables are the operational centerpiece:
- Header row height 36px, background `#F8FAFC`, uppercase label typography (`label-sm`), border-bottom 1px solid `#CBD5E1`.
- Data rows height 44px (default) or 36px (dense). Hover highlight `#F8FAFC`. Selected row `#F1F5F9` with a 3px `#2C1810` left accent bar.
- Right-aligned headers and cell content for all financial and quantitative columns; left-aligned for ingredient names and supplier labels.
- Sticky column options for ingredient IDs and row-level action triggers.

### Metric KPI Cards
- White `#FFFFFF` card bounded by 1px `#E2E8F0`. Internal padding: `space-lg`.
- Top: Category label (`label-sm`, `#64748B`) alongside small contextual period picker or channel badge.
- Center: Key figure formatted with `data-metric`, strictly tabular.
- Bottom: Micro trend pill displaying delta percentage (e.g., `+12.4% vs 어제`) in emerald (favorable) or crimson (unfavorable), accompanied by a miniature sparkline.

### Form Inputs with Unit Affixes
- Input height: 36px. Border 1px solid `#CBD5E1`, background `#FFFFFF`, text `#0F172A`.
- Focus state: Border color `#2C1810`, box-shadow `0 0 0 1px #2C1810`.
- Integrated unit badges (`원`, `g`, `ml`, `개`, `box`) are visually locked inside the right input boundary with background `#F8FAFC`, border-left 1px solid `#E2E8F0`, and text `#64748B`.

### Segmented Channel Controls
- Track container: `#F1F5F9`, 4px padding, 6px border radius.
- Active tab: `#FFFFFF`, text `#2C1810`, 4px border radius, shadow `0 1px 2px rgba(0,0,0,0.06)`.
- Inactive tab: `#64748B`, hover text `#0F172A`.