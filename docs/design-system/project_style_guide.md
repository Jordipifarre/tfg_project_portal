# Style Guide: Citizen Security Data Platform (Your Project)

Based on: *Entrega inicial - Jordi Pifarré Ribes, Universitat de Lleida*

---

## 📋 Project Overview

**Platform:** Citizen Security Data Transparency Portal  
**Users:** Non-technical citizens + data analysts  
**Mission:** Transform passive transparency into active, understandable insights  
**Tech Stack:** Next.js + React + Tailwind CSS + FastAPI backend  
**Key Differentiator:** AI-powered natural language queries (Ollama LLM)

**Three Interaction Modes:**
1. **Manual Exploration:** Tables + articles (traditional data browsing)
2. **Visual Analytics:** Interactive dashboards + charts
3. **Intelligent Assistant:** Natural language queries via RAG + SQL Agent

---

## 🎨 Design Philosophy for Your Platform

### Why This Matters
Your platform bridges a critical gap: making government security data accessible to citizens without technical expertise. The design must reflect:

- **Trust:** Users need confidence they're seeing real, official data
- **Clarity:** Complex security statistics must be comprehensible
- **Humanity:** The AI should enhance, not replace, human understanding
- **Civic Pride:** Empowerment through knowledge about your community

### What That Means Visually
- **Professional, not corporate:** Government credibility without coldness
- **Editorial, not technical:** Information design inspired by quality journalism
- **Accessible, not simplified:** Respect user intelligence while serving clarity
- **Intentional, not trendy:** Design choices should reflect purpose, not fashion

### What to AVOID
❌ Generic SaaS dashboard look  
❌ Bright, playful colors (security data is serious)  
❌ Heavy animations (distract from data)  
❌ Excessive decoration (whitespace is your friend)  
❌ Trendy design patterns (they'll age poorly)  
❌ One-size-fits-all components (different data needs different treatment)  

---

## 🔤 Typography System

### Header Font: **Merriweather** (Serif Display)
- **Why:** Signals editorial quality, institutional credibility, trustworthiness
- **Personality:** Elegant, serious, approachable
- **Usage:** H1 (page titles), H2 (section headers), H3 (subsections)
- **Weight:** Bold (700) for primary headers, Regular (400) for labels
- **Size Scale:**
  - H1: 32px (page titles)
  - H2: 24px (section headers)
  - H3: 18px (subsection headers)
  - Large: 16px (emphasized body text)

### Body Font: **Public Sans** (Sans-Serif)
- **Why:** Open-source, designed for government/civic use, highly readable
- **Personality:** Professional, friendly, accessible
- **Usage:** All body text, form labels, data tables, navigation
- **Weight:** Regular (400) for body, SemiBold (600) for emphasis
- **Size Scale:**
  - Body: 14-16px (primary reading)
  - Small: 12px (captions, meta information)
  - Caption: 11px (data labels in charts)

### Font Pairing Philosophy
Merriweather (serif) + Public Sans (sans-serif) = Editorial authority + civic accessibility

---

## 🎨 Color Palette: Semantic System

Your colors should MEAN something about security data.

### Primary Colors (Institutional Foundation)

**Primary: Deep Navy #1a3a52**
- Government/institutional credibility
- Used for: Headers, navigation, primary CTAs
- Contrast ratio: 10.2:1 on white (excellent)
- Personality: Serious, trustworthy, professional

**Secondary: Warm Slate #475569**
- Support color for secondary actions
- Used for: Secondary buttons, secondary text
- Contrast ratio: 8.1:1 on white
- Personality: Professional, supporting role

### Semantic Colors (Data Meaning)

**Success/Safety: Forest Green #15803d**
- Meaning: Low crime areas, positive trends, safe conditions
- Used for: Positive indicators, green zone highlights
- Contrast ratio: 7.2:1 on white
- Common in: Crime rate charts, safety badges

**Danger/Alert: Ember Red #dc2626**
- Meaning: High crime areas, incidents, alerts
- Used for: Incident highlights, red zone areas, warnings
- Contrast ratio: 5.1:1 on white
- Common in: Incident maps, alert badges

**Warning/Caution: Amber #d97706**
- Meaning: Moderate incidents, requires attention
- Used for: Medium-level alerts, medium crime areas
- Contrast ratio: 4.4:1 on white
- Common in: Medium-severity incident indicators

### Neutral/Background Colors

**White: #ffffff**
- Primary background for readable content
- Used for: Card backgrounds, content areas

**Very Light Gray: #f5f5f5**
- Secondary background for visual separation
- Used for: Alternate table rows, light sections

**Light Gray: #e5e5e5**
- Borders, dividers, subtle separation
- Used for: Table borders, card borders, input borders

**Medium Gray: #a3a3a3**
- Disabled states, secondary text
- Used for: Placeholder text, inactive elements

**Dark Gray: #525252**
- Secondary text (not primary)
- Used for: Meta information, captions

**Charcoal: #1f2937**
- Primary text color
- Used for: Body text, data labels

### Color Usage Rules
1. **Semantic meaning is CRITICAL**
   - Red always means danger/high crime
   - Green always means safety/low crime
   - Never use colors arbitrarily
   
2. **Limit accent colors**
   - Primary + Accent sufficient (don't use all 7 colors equally)
   - Use color to show data meaning, not to decorate
   
3. **Accessibility first**
   - All text must have 4.5:1 contrast ratio minimum
   - Don't rely on color alone (use labels + color)
   - Test with color blindness simulators

4. **Create CSS Variables**
   ```css
   --color-primary: #1a3a52;
   --color-secondary: #475569;
   --color-success: #15803d;
   --color-danger: #dc2626;
   --color-warning: #d97706;
   --color-white: #ffffff;
   --color-light-gray: #f5f5f5;
   --color-border: #e5e5e5;
   --color-text-primary: #1f2937;
   --color-text-secondary: #525252;
   ```

---

## 📐 Spacing System

Base Unit: **8px grid**

This creates a predictable, clean spacing rhythm throughout the app.

### Spacing Scale
```
xs:  4px    (minimal, use rarely)
sm:  8px    (padding inside small components)
md: 16px    (standard padding, most common)
lg: 24px    (section spacing, card padding)
xl: 32px    (large section spacing)
2xl: 48px   (major sections)
3xl: 64px   (full-width section gaps)
4xl: 80px   (large hero spacing)
```

### Application Guidelines

**Navigation Bar:**
- Height: 64px (16px padding top/bottom, content 32px)
- Horizontal padding: 24px each side
- Logo: 24px height

**Data Cards:**
- Padding: 24px on all sides
- Gap between cards: 16px
- Border radius: 8px (if using rounded corners)

**Form Elements:**
- Input height: 40px (8px padding top/bottom)
- Input padding: 12px horizontal
- Label to input gap: 8px
- Form field gap: 16px

**Data Tables:**
- Cell padding: 12px horizontal, 8px vertical
- Header padding: 12px horizontal, 12px vertical (more visual weight)
- Row gap: 1px border or subtle background
- Minimum column width: 80px

**Charts/Visualizations:**
- Container padding: 24px
- Margins from edge: 16px
- Legend spacing: 12px between items

**Section Spacing:**
- Between major sections: 48px (top margin)
- Between related subsections: 24px
- Internal component spacing: 16px

---

## 🧩 Component Design Patterns

### Navigation Header
```
Design: Institutional, clear hierarchy
Height: 64px
Background: --color-primary (#1a3a52)
Text: --color-white
Typography: Public Sans, 14px regular + 16px bold for logo

Elements:
- Logo/brand (left, Merriweather 16px bold, white)
- Navigation menu (center, Public Sans 14px)
  - Active item: Underline in accent or slight background
  - Hover: Subtle text color lightening
- Search icon + user menu (right)

Responsive:
- Desktop: Full menu visible
- Mobile: Hamburger menu
```

### Data Tables
```
Design: Professional, scannable, respects data hierarchy
Background: White (#ffffff)
Header: --color-primary background, white text
Body: Alternating white / #f5f5f5 rows

Typography:
- Header: Public Sans 12px SemiBold, white text, 12px vertical padding
- Data: Public Sans 14px regular, #1f2937 text, 8px vertical padding
- Numbers: Right-aligned for easy comparison
- Date/ID: #525252 secondary gray, smaller (12px)

Interactivity:
- Row hover: Subtle background change to #fafafa (not bold highlight)
- Sortable columns: Arrow icon appears on hover, --color-primary when active
- Striped rows: #ffffff and #f5f5f5 (not colorful)

Signature Detail:
- Top border on header: 2px in --color-primary (visual weight)
- Subtle shadow under header (elevation to separate)
```

### Dashboard Cards
```
Design: Minimalist, clear data hierarchy, signature detail
Background: White (#ffffff)
Border: 1px --color-border (#e5e5e5)
Border-top: 4px in semantic color (red/green/amber based on data)
Padding: 24px
Border-radius: 8px (subtle rounding)

Typography:
- Title: Merriweather 16px bold, --color-primary
- Value: Public Sans 32px bold, --color-text-primary
- Label: Public Sans 12px regular, --color-text-secondary
- Trend: Public Sans 12px, semantic color (green for up, red for down)

Icon Usage:
- Trend arrow: 16px, lucide-react, 1.5px stroke
- Alert icon: 16px, only when severity indicated

Hover State:
- Box shadow increase (subtle elevation)
- Border-top color intensifies slightly
- No background color change

Signature Detail:
- 4px top border in semantic color (success=green, danger=red)
- Creates visual category at a glance
```

### Chat Interface
```
Design: Natural, doesn't dominate, fits existing design system
Position: Right sidebar (desktop) or bottom drawer (mobile)
Width: 360px sidebar (fits typical layouts)

Background: White (#ffffff)
Border-left: 1px --color-border (#e5e5e5)

Typography:
- Title: Merriweather 14px bold, --color-primary
- User message: Public Sans 14px, --color-text-primary (right-aligned)
- Assistant message: Public Sans 14px, --color-text-primary (left-aligned)
- Timestamps: Public Sans 11px, --color-text-secondary

Message Bubbles:
- User: --color-primary background, white text, 8px padding, 4px border-radius
- Assistant: #f5f5f5 background, --color-text-primary text, 8px padding, 4px border-radius
- Both: Max-width 80% to avoid extreme widths

Input Area:
- Background: White
- Border-top: 1px --color-border
- Input field: 36px height, 8px padding, --color-border border
- Send button: --color-primary background, white text, 36x36px

Sources/Citations:
- Always visible below assistant messages
- Typography: Public Sans 11px, --color-primary links
- Display as: "Sources: [1] Title [2] Title"
- Clickable to expand or view source

Important:
- No typing animation (users see "..." is enough)
- No emoji in assistant messages
- Professional, helpful tone (not casual)
- Matches rest of app's design language
```

### Charts & Visualizations
```
Design: Meaningful, not auto-generated defaults
Background: White (#ffffff) or transparent
Grid lines: Only if necessary, light gray (#e5e5e5)

Typography:
- Title: Merriweather 16px bold, --color-primary
- Axis labels: Public Sans 12px, --color-text-secondary
- Tooltip: Public Sans 12px, --color-text-primary on white background

Colors:
- Data series: Semantic meaning
  - Crime incidents: --color-danger (red)
  - Safe areas: --color-success (green)
  - Trend indicators: --color-warning (amber)
- Background: White or light gray only
- Grid: #e5e5e5 (light gray)

Legend:
- Position: Above chart (not always at bottom)
- Typography: Public Sans 12px
- Layout: Horizontal if space allows
- No background color (simple text + color swatch)

Labels:
- Integrate into chart where possible
- Use annotations for important data points
- Avoid floating labels

Signature Detail:
- Consistent stroke width (2px for lines, not variable)
- Consistent marker sizes (6px dots)
- One accent color for highlighting trends
```

---

## ✨ Interactive States & Micro-interactions

### Buttons

**Primary Button (CTAs)**
```
Default:
- Background: --color-primary (#1a3a52)
- Text: --color-white
- Padding: 12px 24px
- Font: Public Sans 14px SemiBold
- Border-radius: 4px

Hover:
- Background: Slightly lighter (lighten 10%)
- No additional shadow (stay flat)

Focus:
- Outline: 2px solid --color-primary
- Outline-offset: 2px

Active/Disabled:
- Opacity: 0.6
- Cursor: not-allowed
```

**Secondary Button**
```
Default:
- Background: Transparent
- Border: 1px solid --color-primary
- Text: --color-primary
- Padding: 12px 24px

Hover:
- Background: #f5f5f5 (light gray)

Focus:
- Outline: 2px solid --color-primary

Active:
- Background: --color-primary
- Text: white
```

### Form Elements

**Text Input**
```
Default:
- Border: 1px solid --color-border (#e5e5e5)
- Padding: 8px 12px
- Height: 40px
- Background: White
- Font: Public Sans 14px

Focus:
- Border: 2px solid --color-primary
- Outline: None (use border instead)
- Box-shadow: None (keep flat)

Filled/Valid:
- Border: 1px solid --color-success

Error:
- Border: 1px solid --color-danger
- Text below: Public Sans 11px, --color-danger
```

### Hover States (General)
- **Philosophy:** Subtle, purposeful (not every element needs hover effect)
- **Links:** Text color slightly darker, underline appears (or thickens if already present)
- **Cards:** Box-shadow increases (0 4px 12px rgba(0,0,0,0.1))
- **Buttons:** Background subtle shift (not bold change)
- **Data rows:** Very subtle background (if any) - #fafafa only
- **Icons:** No change (they inherit text color)

### Focus States (Accessibility)
- **CRITICAL:** Every interactive element needs clear focus state
- **Method:** 2px outline in --color-primary, 2px offset
- **Alternative:** High-contrast background + visible border
- **Test:** Must work for keyboard navigation

### Loading States
- **If animated:** Subtle spinner (12-16px, use 1.5px stroke)
- **Color:** --color-primary
- **Location:** Inside button, or as small spinner near content
- **Philosophy:** Minimal animation (not spinning everywhere)

### Active States
- **Current page in nav:** Underline + --color-primary text
- **Selected table row:** Subtle left border in --color-primary (3px)
- **Chart highlight:** Emphasis through opacity, not color change

---

## 📱 Responsive Design

**Breakpoints:**
```
Mobile: 375px - 767px
Tablet: 768px - 1023px
Desktop: 1024px+
```

**Grid System:**
- Desktop: 12-column grid, 24px gutters
- Tablet: 8-column grid, 16px gutters
- Mobile: 4-column grid, 12px gutters

**Navigation:**
- Desktop: Full horizontal menu
- Tablet: Hamburger + drawer
- Mobile: Hamburger + full-screen drawer (avoid sidebar)

**Layout Changes:**
- Desktop: 2-3 column layouts (sidebar + content common)
- Tablet: 1-column with full-width content
- Mobile: Always 1-column

**Typography Scaling:**
- Increase font sizes on mobile (readability priority)
- Reduce padding/spacing on mobile (but don't sacrifice breathing room)

---

## 🎯 Signature Details (Make It Yours)

These details make the design feel handcrafted and specific to YOUR platform.

### Signature 1: Top-Border Color System
**Concept:** All data cards have a 4px top border in semantic color
- Success (green): Safe neighborhoods, low crime
- Danger (red): High-crime areas, alert-worthy
- Warning (amber): Moderate incidents
- Neutral (gray): General information

**Why it works:**
- Creates category at a glance
- Minimal visual effect but high impact
- Consistent across all cards
- Accessible (not color-only, combined with content)

### Signature 2: Merriweather + Public Sans Typography
**Concept:** Distinctive serif + sans-serif pairing communicates editorial authority
- Headers feel institutional (serif = credibility)
- Body feels accessible (sans-serif = readability)
- Not using generic defaults

**Why it works:**
- Immediately recognizable as your platform
- Conveys quality journalism approach to data
- Accessible while maintaining professional tone

### Signature 3: Semantic Color Meaning
**Concept:** Colors always mean something about security
- Red = Danger/High-crime areas
- Green = Safe/Low-crime areas
- Amber = Caution/Moderate incidents
- Never arbitrary

**Why it works:**
- Users learn color language quickly
- Supports data understanding without reading labels
- Reflects platform's focus on security insights

### Signature 4: Clean Data Presentation
**Concept:** Whitespace is valued, grid is respected, no decoration without purpose
- Generous padding in cards (24px)
- Clear separation between sections
- No gradients, no complex shadows
- Every element serves information

**Why it works:**
- Makes complex data feel understandable
- Professional without feeling corporate
- Prioritizes citizen understanding

---

## ❌ What NOT to Do

### Typography Mistakes
❌ Using generic fonts (Inter, Roboto, Poppins)
❌ Mixing 3+ fonts
❌ Using very small font sizes (hard to read)
❌ Heavy font weights for body text
✅ Do: Merriweather + Public Sans, sizes 14-16px body, appropriate weights

### Color Mistakes
❌ Purple/pink gradients
❌ Bright, playful colors for security data
❌ Using all 7 colors equally
❌ Colors without meaning
❌ Low contrast (hard to read)
✅ Do: Semantic colors (red/green/amber), high contrast, limited palette

### Spacing Mistakes
❌ Inconsistent padding (12px here, 18px there)
❌ Cramped layouts (no breathing room)
❌ Random margin values
❌ Ignoring grid system
✅ Do: 8px grid system, consistent 24px padding, generous spacing

### Component Mistakes
❌ Overdesigned buttons with shadows + gradients
❌ Every element has a hover effect
❌ Unnecessary animations everywhere
❌ Data tables with too many colors
❌ SaaS template look
✅ Do: Simple, purposeful design, few but effective interactions, clean tables

### Layout Mistakes
❌ Centered navigation
❌ Asymmetrical without intention
❌ Too many columns on mobile
❌ Content too wide (hard to read)
✅ Do: Left-aligned nav, intentional layout, responsive grid, readable line lengths

---

## 🚀 Implementation Checklist

When implementing this design system, verify:

- [ ] **Typography**
  - [ ] All H1s using Merriweather 32px bold
  - [ ] All H2s using Merriweather 24px bold
  - [ ] All body text using Public Sans 14-16px
  - [ ] Consistent font weights throughout

- [ ] **Color**
  - [ ] Primary color #1a3a52 used consistently for CTAs
  - [ ] Semantic colors (red/green/amber) match data meaning
  - [ ] All text meets 4.5:1 contrast ratio
  - [ ] CSS variables created for all colors

- [ ] **Spacing**
  - [ ] All padding follows 8px grid
  - [ ] Card padding 24px on all sides
  - [ ] Section gaps 24-48px
  - [ ] Consistent throughout app

- [ ] **Components**
  - [ ] Navigation header 64px, proper styling
  - [ ] Data tables professional, scannable
  - [ ] Dashboard cards have top border in semantic color
  - [ ] Chat interface integrated without dominating
  - [ ] Buttons clear and consistent

- [ ] **Interactive States**
  - [ ] All buttons have hover state
  - [ ] All interactive elements have focus state
  - [ ] Form inputs clear focus feedback
  - [ ] Links underlined and obvious

- [ ] **Responsive**
  - [ ] Mobile: Single column, readable
  - [ ] Tablet: 2 columns max, proportional
  - [ ] Desktop: Full layout, optimal reading

- [ ] **Accessibility**
  - [ ] All text readable (14px+ body)
  - [ ] High contrast (4.5:1 minimum)
  - [ ] Focus states visible
  - [ ] Semantic HTML

- [ ] **Signature Details**
  - [ ] Dashboard cards have colored top borders
  - [ ] Typography pairing is distinctive
  - [ ] Color system is semantic
  - [ ] No template-like elements

---

## 📚 Files to Create/Update

### CSS Variables File
```css
:root {
  /* Typography */
  --font-display: 'Merriweather', serif;
  --font-body: 'Public Sans', sans-serif;
  
  /* Colors */
  --color-primary: #1a3a52;
  --color-secondary: #475569;
  --color-success: #15803d;
  --color-danger: #dc2626;
  --color-warning: #d97706;
  --color-white: #ffffff;
  --color-light-gray: #f5f5f5;
  --color-border: #e5e5e5;
  --color-text-primary: #1f2937;
  --color-text-secondary: #525252;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  
  /* Sizing */
  --nav-height: 64px;
  --card-padding: 24px;
  --border-radius: 8px;
  --border-radius-sm: 4px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-lg: 0 12px 24px rgba(0,0,0,0.15);
}
```

---

## 📞 Quick Reference: When Using Claude Code

**Save this prompt:**

```
Style my Next.js citizen security platform component.

SYSTEM:
- Fonts: Merriweather (headers) + Public Sans (body)
- Colors: #1a3a52 primary, #15803d success, #dc2626 danger, #d97706 warning
- Spacing: 8px grid
- Signature: Data cards have 4px top border in semantic color

COMPONENT: [What you're styling]
CURRENT: [Paste code]
DESIRED: [What it should feel like]

Include reasoning for design choices.
```

---

**You've got this! Your platform deserves design that's as thoughtful as its mission. 🚀**
