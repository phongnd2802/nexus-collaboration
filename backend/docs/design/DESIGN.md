# Design System Inspired by Claude

## 1. Visual Theme & Atmosphere

Claude's design system embodies a sophisticated, minimalist aesthetic rooted in clarity and purposeful simplicity. The visual language prioritizes content and interaction over decoration, creating an uncluttered interface that communicates trustworthiness and intelligence. Warm, human-centered typography combines with a restrained color palette dominated by deep neutrals and selective accent colors that punctuate moments of importance. The overall atmosphere is professional yet approachable—designed for knowledge workers, developers, and problem-solvers who value precision and efficiency. Every visual element serves a functional purpose, reflecting Claude's role as a capable AI assistant for complex, analytical work.

**Key Characteristics**
- Minimalist, content-first design philosophy
- Warm, serif-forward typography system for hierarchy and personality
- Deep neutral palette with strategic warm accent colors
- Subtle, refined elevation through carefully calibrated shadows
- Generous whitespace and breathing room throughout layouts
- Modern sans-serif for interface elements; serif for display and emphasis
- Accessible, high-contrast text combinations
- Smooth, understated interactions without excessive ornamentation

## 2. Color Palette & Roles

### Primary
- **Deep Charcoal** (`#1F1E1D`): Primary text color for body copy, headings, and high-emphasis interface text; used extensively across the system
- **True Black** (`#141413`): Deep background accents, high-contrast text layers, and secondary structural elements

### Accent Colors
- **Warm Terracotta** (`#D97757`): Primary call-to-action accent, logo/brand mark accent, and emphasis on key interactive moments
- **Deep Purple** (`#8250DF`): Secondary accent for special features, highlights, and differentiation in complex UI layouts
- **Vibrant Google Blue** (`#4285F4`): Integration accent for third-party services and OAuth authentication flows
- **Soft Periwinkle** (`#5E6AD2`): Softer accent tone for secondary actions and contextual highlights
- **Warm Coral** (`#DC6038`): Alert and notification accents for user attention

### Interactive
- **Slack Red** (`#E01E5A`): Status indicator and high-priority alerts
- **Warning Amber** (`#D29922`): Warning states, cautions, and non-critical alerts

### Neutral Scale
- **Medium Gray** (`#3D3D3A`): Secondary text, disabled states, and muted interface elements
- **Light Gray** (`#73726C`): Tertiary text, helper text, and subtle UI separators
- **Off-White** (`#FAF9F5`): Page background, light surfaces, and subtle container fills
- **Pure White** (`#FFFFFF`): Content cards, input backgrounds, and high-contrast surfaces
- **True Black** (`#000000`): Fallback black for critical contrast requirements

### Surface & Borders
- **Muted Border** (`#1F1E1D` at 15% opacity): Input field borders and light divider lines
- **Subtle Divider** (`#1F1E1D` at 30% opacity): Card borders and container edges
- **Soft Accent** (`#BCD1CA`): Secondary surface tint for accessibility overlays and supporting UI

## 3. Typography Rules

### Font Family
**Primary Display Font:** Anthropic Serif (serif stack fallback: Georgia, Times New Roman, serif) — used for headings, hero text, and brand-forward moments
**Secondary Interface Font:** Anthropic Sans (sans-serif stack fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif) — used for body, buttons, inputs, navigation, and all interface text

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display H1 | Anthropic Serif | 56px | 330 | 67.2px | 0px | Hero headlines, landing page titles |
| Heading H2 | Anthropic Serif | 48px | 400 | 57.6px | -0.5px | Section headers, major page divisions |
| Heading H3 | Anthropic Sans | 32px | 400 | 38.4px | 0px | Subsection headers, card titles |
| Heading H4 | Anthropic Sans | 24px | 400 | 28.8px | 0px | Component headers, feature titles |
| Subheading | Anthropic Sans | 17px | 400 | 25.5px | 0px | Card subtitles, metadata headers |
| Body Large | Anthropic Sans | 16px | 430 | 24px | 0px | Primary body text, input fields |
| Body Regular | Anthropic Sans | 15px | 400 | 22.5px | 0px | Default body copy, descriptions |
| Button Text | Anthropic Sans | 15px | 400 | 22.5px | 0px | Button labels, call-to-action text |
| Label | Anthropic Sans | 14px | 430 | 19.6px | 0.25px | Form labels, input labels |
| Caption | Anthropic Sans | 12px | 400 | 16px | 0px | Helper text, captions, metadata |
| Code | Anthropic Sans | 13px | 500 | 19.5px | 0px | Inline code, code blocks |

### Principles
- **Scale over decoration:** Use size and weight progression to create visual hierarchy; avoid ornamental typography
- **Readability first:** Maintain minimum 15px body text and sufficient line height (1.5x base) for extended reading
- **Serif for emphasis:** Reserve Anthropic Serif for display contexts where brand personality and warmth matter most
- **Consistent letter-spacing:** Maintain 0px default with tighter spacing (`-0.5px`) only for large display text
- **Accessibility focus:** All text meets WCAG AA contrast ratios; body text on light backgrounds uses `#1F1E1D` or `#141413`

## 4. Component Stylings

### Buttons

#### Primary Button
- **Background:** `#1F1E1D`
- **Text Color:** `#FFFFFF`
- **Font:** Anthropic Sans, 15px, weight 400, line-height 22.5px
- **Padding:** `12px 24px`
- **Border Radius:** `9.6px`
- **Border:** `0px`
- **Box Shadow:** `rgba(0, 0, 0, 0.04) 0px 4px 20px 0px`
- **Height:** `44px`
- **Hover State:** Background `#0A0A0A`, box shadow `rgba(0, 0, 0, 0.08) 0px 8px 28px 0px`
- **Active State:** Background `#000000`, transform scale 0.98
- **Disabled State:** Background `#3D3D3A`, text color `#73726C`, cursor not-allowed

#### Secondary Button
- **Background:** `#FFFFFF`
- **Text Color:** `#1F1E1D`
- **Font:** Anthropic Sans, 15px, weight 400, line-height 22.5px
- **Padding:** `12px 24px`
- **Border Radius:** `9.6px`
- **Border:** `1px solid rgba(31, 30, 29, 0.3)`
- **Box Shadow:** none
- **Height:** `44px`
- **Hover State:** Background `#FAF9F5`, border color `rgba(31, 30, 29, 0.6)`
- **Active State:** Background `#F0F0ED`, border color `rgba(31, 30, 29, 0.8)`
- **Disabled State:** Background `#FAF9F5`, text color `#73726C`, border color `rgba(31, 30, 29, 0.15)`, cursor not-allowed

#### Ghost Button
- **Background:** transparent
- **Text Color:** `#1F1E1D`
- **Font:** Anthropic Sans, 15px, weight 400, line-height 22.5px
- **Padding:** `8px 16px`
- **Border Radius:** `8px`
- **Border:** `1px solid rgba(31, 30, 29, 0.3)`
- **Box Shadow:** none
- **Height:** `40px`
- **Hover State:** Background `rgba(31, 30, 29, 0.04)`, border color `rgba(31, 30, 29, 0.6)`
- **Active State:** Background `rgba(31, 30, 29, 0.08)`
- **Disabled State:** Text color `#73726C`, border color `rgba(31, 30, 29, 0.15)`, cursor not-allowed

### Cards & Containers

#### Standard Card
- **Background:** `#FFFFFF`
- **Border:** `1px solid rgba(31, 30, 29, 0.15)`
- **Border Radius:** `12px`
- **Padding:** `32px`
- **Box Shadow:** `rgba(0, 0, 0, 0.04) 0px 4px 20px 0px`
- **Hover State:** Box shadow `rgba(0, 0, 0, 0.016) 0px 4px 24px 0px, rgba(0, 0, 0, 0.016) 0px 4px 32px 0px, rgba(0, 0, 0, 0.01) 0px 2px 64px 0px, rgba(0, 0, 0, 0.01) 0px 16px 32px 0px`

#### Pricing Card
- **Background:** `#FFFFFF`
- **Border:** `1px solid rgba(31, 30, 29, 0.15)`
- **Border Radius:** `12px`
- **Padding:** `40px 32px`
- **Box Shadow:** `rgba(0, 0, 0, 0.04) 0px 4px 20px 0px`
- **Highlighted State:** Border color `#D97757` (2px solid), box shadow `rgba(217, 119, 87, 0.1) 0px 8px 32px 0px`

#### Container (Full-width Section)
- **Background:** `#FAF9F5`
- **Padding:** `64px 40px`
- **Border:** none
- **Min Height:** 100vh for hero sections

### Inputs & Forms

#### Text Input Default
- **Background:** `#FFFFFF`
- **Text Color:** `#141413`
- **Font:** Anthropic Sans, 16px, weight 430, line-height 22.4px
- **Padding:** `12px 16px`
- **Border Radius:** `9.6px`
- **Border:** `1px solid rgba(31, 30, 29, 0.15)`
- **Height:** `44px`
- **Placeholder Color:** `rgba(61, 61, 58, 0.6)`
- **Hover State:** Border color `rgba(31, 30, 29, 0.3)`
- **Focus State:** Border color `#1F1E1D`, box shadow `0 0 0 3px rgba(31, 30, 29, 0.1)`, outline none
- **Disabled State:** Background `#FAF9F5`, text color `#73726C`, border color `rgba(31, 30, 29, 0.15)`, cursor not-allowed

#### Text Input with Label
- **Label Font:** Anthropic Sans, 14px, weight 430, line-height 19.6px
- **Label Color:** `#1F1E1D`
- **Label Margin:** `0px 0px 8px 0px`
- **Hint Text:** Anthropic Sans, 12px, weight 400, color `#73726C`, margin top `4px`

#### Checkbox/Radio
- **Size:** 20px × 20px
- **Border Radius:** `4px` (checkbox), `50%` (radio)
- **Border:** `2px solid rgba(31, 30, 29, 0.3)`
- **Background:** `#FFFFFF`
- **Checked State:** Background `#1F1E1D`, border color `#1F1E1D`, checkmark/dot `#FFFFFF`
- **Focus State:** Box shadow `0 0 0 3px rgba(31, 30, 29, 0.1)`

### Navigation

#### Header Navigation
- **Background:** `#FAF9F5`
- **Height:** `84px`
- **Padding:** `0px 40px`
- **Border Bottom:** `1px solid rgba(31, 30, 29, 0.1)`
- **Display:** Flex, align-items center, justify-content space-between
- **Logo:** `32px` height, margin right `40px`

#### Navigation Link (Default)
- **Text Color:** `#1F1E1D`
- **Font:** Anthropic Sans, 16px, weight 400, line-height 24px
- **Padding:** `8px 12px`
- **Hover State:** Color `#3D3D3A`, background `rgba(31, 30, 29, 0.04)`
- **Active State:** Color `#D97757`, border bottom `2px solid #D97757`, padding bottom `6px`

#### Dropdown Menu
- **Background:** `#FFFFFF`
- **Border:** `1px solid rgba(31, 30, 29, 0.15)`
- **Border Radius:** `12px`
- **Box Shadow:** `rgba(0, 0, 0, 0.016) 0px 4px 24px 0px, rgba(0, 0, 0, 0.016) 0px 4px 32px 0px, rgba(0, 0, 0, 0.01) 0px 2px 64px 0px, rgba(0, 0, 0, 0.01) 0px 16px 32px 0px`
- **Menu Item Padding:** `12px 16px`
- **Menu Item Hover:** Background `#FAF9F5`

### Tabs

#### Tab Button
- **Background:** transparent
- **Text Color:** `#73726C`
- **Font:** Anthropic Sans, 15px, weight 400, line-height 22.5px
- **Padding:** `12px 20px`
- **Border Bottom:** `2px solid transparent`
- **Hover State:** Text color `#3D3D3A`, border bottom color `rgba(31, 30, 29, 0.2)`
- **Active State:** Text color `#1F1E1D`, border bottom color `#D97757` (2px solid)

#### Tab Container
- **Background:** transparent
- **Border Top:** `1px solid rgba(31, 30, 29, 0.1)`
- **Display:** Flex
- **Gap:** `0px`

### Badges

#### Badge Default
- **Background:** `#FAF9F5`
- **Text Color:** `#1F1E1D`
- **Font:** Anthropic Sans, 12px, weight 400, line-height 16px
- **Padding:** `4px 12px`
- **Border Radius:** `8px`
- **Border:** `1px solid rgba(31, 30, 29, 0.15)`

#### Badge Success
- **Background:** `rgba(34, 197, 94, 0.1)`
- **Text Color:** `#15803d`
- **Border:** `1px solid rgba(34, 197, 94, 0.3)`

#### Badge Warning
- **Background:** `rgba(210, 153, 34, 0.1)`
- **Text Color:** `#B45309`
- **Border:** `1px solid rgba(210, 153, 34, 0.3)`

#### Badge Error
- **Background:** `rgba(224, 30, 90, 0.1)`
- **Text Color:** `#BE123C`
- **Border:** `1px solid rgba(224, 30, 90, 0.3)`

## 5. Layout Principles

### Spacing System
Claude's spacing system is built on a `4px` base unit, scaling to create visual hierarchy and breathing room. The scale progresses: `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `28px`, `32px`, `40px`, `48px`, `56px`, `64px`.

**Usage Context:**
- **4px–8px:** Micro-spacing within components (icon margins, badge padding adjustments)
- **12px–16px:** Internal component padding (buttons, inputs, chips)
- **20px–24px:** Gap between related elements (list items, form fields)
- **32px–40px:** Section spacing (padding within containers, gap between related groups)
- **48px–64px:** Major section dividers (spacing between content sections, vertical rhythm)

### Grid & Container
- **Max Width:** `1440px` for full-width layouts, centered with symmetric margins
- **Container Padding:** `40px` left/right on desktop (80px total horizontal); `24px` on tablet; `20px` on mobile
- **Column Strategy:** 12-column CSS Grid or CSS Flexbox; content typically spans 10–12 columns with 1–2 column gutters on larger screens
- **Section Patterns:** Hero spans full width with contained text block (max-width `800px`); feature grids use 3-column layout; pricing tiers use 3-column grid with center emphasis

### Whitespace Philosophy
Whitespace is an active design tool in Claude's system. Generous margins and padding between sections communicate thoughtfulness and prevent cognitive overload. Content blocks are surrounded by at least `56px` of vertical whitespace; horizontally, sections maintain `40px` margins from container edges. This creates a balanced, breathing interface that guides user attention naturally through the page.

### Border Radius Scale
- **Sharp (0px):** Full-width containers, section dividers
- **Subtle (4px):** Checkboxes, small utility components
- **Rounded (8px):** Ghost buttons, secondary containers, tertiary elements
- **Generously Rounded (9.6px):** Primary buttons, text inputs, prominent interactive elements
- **Very Rounded (12px):** Cards, dropdown menus, featured containers, pricing cards
- **Circular (50%):** Avatar images, radio buttons, action dots/menus

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (None) | `box-shadow: none` | Background containers, section fills, navigation |
| Subtle (sm) | `rgba(0, 0, 0, 0.04) 0px 4px 20px 0px` | Cards at rest, input fields, subtle UI lift |
| Medium (md) | `rgba(0, 0, 0, 0.016) 0px 4px 24px 0px, rgba(0, 0, 0, 0.016) 0px 4px 32px 0px, rgba(0, 0, 0, 0.01) 0px 2px 64px 0px, rgba(0, 0, 0, 0.01) 0px 16px 32px 0px` | Cards on hover, modals, dropdowns, elevated overlays |
| Deep (lg) | `rgba(27, 103, 178, 0.1) 0px 4px 24px 0px` | Focused interactive states, special feature highlights |

**Shadow Philosophy:** Claude uses subtle, multi-layer shadows that replicate natural light falloff. Rather than harsh single shadows, the system layers multiple shadow values at varying blur and spread radii to create depth that feels organic and refined. Shadows are desaturated and never use pure black, maintaining the warm, approachable tone of the brand. Elevation is used sparingly to maintain visual simplicity—depth is communicated primarily through layering, contrast, and whitespace rather than excessive shadow effects.

## 7. Do's and Don'ts

### Do
- **Use the serif font for display text** — Anthropic Serif commands attention and communicates brand personality; reserve it for headings, hero statements, and moments where warmth matters
- **Maintain high contrast ratios** — Ensure all text on backgrounds meets WCAG AA (4.5:1 for body, 3:1 for large text); default to `#1F1E1D` or `#141413` for text over light backgrounds
- **Embrace whitespace** — Create breathing room with generous margins and padding; visual hierarchy emerges from space, not from crowding elements
- **Use warm accent colors purposefully** — `#D97757` (terracotta) is reserved for primary CTAs and brand moments; use secondary accents (`#8250DF`, `#5E6AD2`) to differentiate supporting interactions
- **Layer subtle shadows** — Use the provided multi-layer shadow values to create depth; avoid single, harsh shadows
- **Keep borders consistent** — Use `rgba(31, 30, 29, 0.15)` for subtle dividers, `0.3` for stronger borders, and reserve solid dark borders for high-contrast focus states
- **Test button sizes** — Maintain minimum `44px` height and ensure touch targets are at least `48px × 48px` for mobile accessibility
- **Apply consistent border radius** — Match radius values within component families (all buttons `9.6px`, all cards `12px`, etc.)

### Don't
- **Mix serif and sans in the same headline** — Choose one; apply serif for main headings, sans for subheadings for clarity
- **Use bright, saturated accent colors for non-interactive UI** — Reserve `#D97757` and secondary accents for interactive moments; mute colors in static backgrounds
- **Apply shadows without purpose** — Elevation communicates interactivity and importance; avoid shadow on every element
- **Create input heights below 44px** — Maintain accessible touch targets; 40px minimum for secondary inputs, 44px for primary
- **Use pure black (`#000000`) for body text** — Default to `#1F1E1D` or `#141413` for warmth; reserve pure black for high-contrast accessibility requirements
- **Ignore padding in buttons and inputs** — Always include internal padding (`12px 16px` minimum) to create breathing room and improve readability
- **Mix border radius values arbitrarily** — Use the defined scale; consistency strengthens visual cohesion across the system
- **Nest more than 2 levels of navigation** — Keep dropdown menus flat; complexity should be handled through page structure, not nested menus
- **Use gray text below `#73726C` for body text** — Maintain sufficient contrast; secondary text should not drop below 4.5:1 on white backgrounds
- **Override focus states** — Always provide visible focus indicators (border color change, outline, or box-shadow) for keyboard accessibility

## 8. Responsive Behavior

### Breakpoints

| Breakpoint Name | Width | Key Changes | Typography Scale |
|-----------------|-------|-------------|-------------------|
| Mobile | 320px–639px | Single-column layout, full-width cards, 20px padding, vertical stacks, hamburger navigation | 14px body, 24px h3 |
| Tablet | 640px–1023px | 2-column grid, 24px padding, stacked pricing cards, collapsing navigation | 15px body, 28px h3 |
| Desktop | 1024px–1439px | 3-column grids, 40px padding, side-by-side layouts, full navigation | 15px body, 32px h3 |
| Large Desktop | 1440px+ | Max-width `1440px` container, centered layout, full feature display | 16px body, 48px h2 |

### Touch Targets
- **Minimum Interactive Size:** `44px × 44px` for all touch-based interactions (buttons, links, input fields)
- **Comfortable Spacing:** Minimum `12px` gap between adjacent interactive elements to prevent accidental activation
- **Button Padding on Mobile:** Increase to `16px 24px` vertically/horizontally to accommodate larger touch targets
- **Link Tap Areas:** Extend invisible tap area to `48px × 48px` around small link text
- **Icon Buttons:** Maintain `40px × 40px` at minimum; 44px preferred

### Collapsing Strategy
- **Navigation:** Desktop horizontal menu collapses to hamburger icon on tablet (`<1024px`); dropdown menus become full-screen slide-out drawer
- **Pricing Cards:** 3-column grid on desktop → 2-column on tablet → single column on mobile; highlighted card remains visually emphasized
- **Hero Section:** Multi-column layout (text + image) stacks vertically on tablet; text centers and image repositions below on mobile
- **Form Fields:** Full-width single-column on mobile; multi-column grids on tablet+
- **Section Padding:** Reduce from `64px` to `48px` on tablet, `40px` on mobile to conserve space
- **Typography Scale:** Reduce h2 from `56px` to `48px` on tablet, `32px` on mobile; maintain minimum `18px` body text
- **Spacing Scale:** Reduce major gaps from `64px` to `48px` on tablet, `32px` on mobile
- **Images:** Constrain to 100% container width on mobile; use `max-width` on desktop to prevent distortion

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA:** Warm Terracotta (`#D97757`) — use for primary buttons, brand accents, key call-to-action moments
- **Primary Text:** Deep Charcoal (`#1F1E1D`) — body copy, headings, interface text
- **Background (Light):** Off-White (`#FAF9F5`) — section backgrounds, container fills, page backgrounds
- **Background (Card):** Pure White (`#FFFFFF`) — cards, containers, input backgrounds
- **Secondary Text:** Medium Gray (`#3D3D3A`) — descriptions, secondary info, muted UI
- **Tertiary Text:** Light Gray (`#73726C`) — helper text, captions, disabled states
- **Border:** Muted Border (`#1F1E1D` 15% opacity) — subtle dividers, input borders, container edges
- **Button Background:** True Black (`#141413` or `#1F1E1D`) — primary button fill
- **Button Text:** Pure White (`#FFFFFF`) — contrast on dark button backgrounds
- **Accent (Secondary):** Deep Purple (`#8250DF`) — supporting interactive moments, differentiation
- **Status Warning:** Warning Amber (`#D29922`) — warning states, non-critical alerts
- **Status Alert:** Slack Red (`#E01E5A`) — errors, critical alerts, high-priority indicators

### Iteration Guide
1. **Typography Foundation:** Always use Anthropic Serif for display text (`h1`, `h2`); use Anthropic Sans for all interface text (buttons, inputs, body, navigation). Match exact font sizes from the hierarchy table (`56px` for h1, `48px` for h2, `16px` for body, etc.).
2. **Button Styling:** Primary buttons must be `#1F1E1D` background with `#FFFFFF` text, `44px` height, `9.6px` border radius, `12px 24px` padding. Secondary buttons are `#FFFFFF` background with `#1F1E1D` text and `1px solid rgba(31, 30, 29, 0.3)` border.
3. **Input Consistency:** All text inputs must be `#FFFFFF` background, `#141413` text, `44px` height, `9.6px` border radius, `1px solid rgba(31, 30, 29, 0.15)` border, `12px 16px` padding, and include focus state with `#1F1E1D` border.
4. **Card Elevation:** Cards at rest use subtle shadow (`rgba(0, 0, 0, 0.04) 0px 4px 20px 0px`); on hover, upgrade to medium shadow with full multi-layer treatment. Border always `1px solid rgba(31, 30, 29, 0.15)`.
5. **Spacing Discipline:** Use the base `4px` unit and the defined scale (`8px`, `16px`, `24px`, `32px`, `40px`, `64px`). Never invent arbitrary spacing; maintain consistent gaps between components and sections.
6. **Color Role Discipline:** Reserve `#D97757` (terracotta) for primary interactive moments only. Use secondary accents (`#8250DF`, `#5E6AD2`) for supporting UI. Default text is always `#1F1E1D` or `#141413`; avoid mid-tone grays for body text.
7. **Border Radius Consistency:** Buttons and inputs = `9.6px`, cards and dropdowns = `12px`, checkboxes = `4px`, ghost buttons = `8px`. Never use arbitrary radius values.
8. **Shadow Application:** Never apply shadow to navigation, section containers, or static backgrounds. Use shadows only on elevated interactive components (cards on hover, dropdowns, modals, tooltips).
9. **Responsive Stacking:** At mobile breakpoint (`<640px`), stack all multi-column layouts vertically; convert horizontal navigation to hamburger menu; increase padding to maintain breathing room. Always ensure touch targets are minimum `44px × 44px` and `12px` apart.
10. **Accessibility Priority:** All text must meet WCAG AA contrast (4.5:1 minimum). Provide visible focus states on all interactive elements (outline or border color change). Include `:hover`, `:active`, and `:disabled` states for all buttons and inputs. Maintain label associations in forms; use proper semantic HTML.