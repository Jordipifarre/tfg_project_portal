# Quick Reference: Claude Code Prompts for Your Citizen Security Platform

## Your Project Context

**Platform:** Citizen Security Data Transparency Portal
**Tech Stack:** Next.js + React + Tailwind CSS
**Mission:** Make government security data accessible to non-technical citizens
**Three Interaction Modes:**
1. Manual data exploration (tables + articles)
2. Interactive dashboards (charts + visualizations)
3. AI-powered chat assistant (natural language queries)

---

## 🎯 Main Design Philosophy

Your design should communicate:
- **Trust** (institutional credibility for government data)
- **Clarity** (understandable to non-technical users)
- **Accessibility** (WCAG AA compliant)
- **Intention** (every choice has purpose, not trendy)

**NOT:** Generic SaaS template, playful design, bright gradients, AI-generated vibes

---

## 💡 Copy-Paste Prompt Templates

### Template A: Complete UI Overhaul

```
I'm building a citizen security data transparency platform with Next.js.
The platform displays government security data for the general public.

DESIGN REQUIREMENTS:
- Professional, trustworthy tone (institutional credibility)
- Accessible to non-technical citizens
- Three modes: manual tables/articles, interactive dashboards, AI chat
- Must feel INTENTIONAL and HANDCRAFTED, not AI-generated

AESTHETIC: Professional + Editorial (journalism-inspired)
- Header font: Serif with authority (suggested: Merriweather, EB Garamond, or Crimson Text)
- Body font: Highly readable sans-serif (suggested: Public Sans, DM Sans, or Sohne)
- Colors: Semantic palette tied to data meaning (not rainbow defaults)
- Spacing: Generous, consistent 8px grid
- Icons: All Lucide React, 24px, 1.5px stroke

WHAT NOT TO DO:
❌ Purple/pink gradients, generic fonts (Inter, Roboto), SaaS templates, playful elements, unnecessary animations

COMPONENTS TO STYLE:
1. Navigation header (institutional, clear)
2. Data tables (professional, scannable)
3. Dashboard cards (minimalist, clear hierarchy)
4. Charts (meaningful colors, clean design)
5. Chat interface (sidebar, doesn't dominate)
6. Article section (editorial layout)

Please style [COMPONENT NAME] with clear visual hierarchy and explain your color/font choices.
```

### Template B: Fix Generic Design

```
My Next.js platform looks too generic/template-like. Help me make it feel handcrafted.

CURRENT STATE: [Describe what feels generic - e.g., "buttons look like every SaaS", "colors are muted and uninspired"]

DESIRED STATE: Design that feels intentional, professional, unique to this security data platform

FIX BY:
1. Typography: Replace generic fonts with distinctive choices
   - Headers: Serif font (authority)
   - Body: Readable sans-serif
   
2. Colors: Make semantic, not safe
   - Primary color: [Strong choice, e.g., deep navy or slate]
   - Accent: [Meaningful, tied to data]
   - Don't use: purple/pink, rainbow, every color equally
   
3. Details: Add intentional touches
   - Border treatments (consistent 1px, not shadows)
   - Spacing rhythm (generous, breathable)
   - Icon system (consistent style)
   - Hover/focus states (subtle, refined)

Please redesign [SPECIFIC COMPONENT] to feel less template-like and more custom-built.
Explain your reasoning for each choice.
```

### Template C: Establish Design System

```
Help me create a design system for my citizen security data platform (Next.js).

REQUIREMENTS:
- Professional, institutional feeling
- Accessible (WCAG AA)
- Semantic color usage (colors mean something in data context)
- Intentional, not trendy
- Must feel handcrafted, not AI-generated

CREATE:
1. Color Palette (5-7 colors max)
   - Primary: [Government/institutional feel]
   - Secondary: [Support color]
   - Accent: [CTA/highlight]
   - Danger: [Security alerts]
   - Success: [Safety indicators]
   - Neutrals: [Grays for hierarchy]
   
2. Typography
   - Display Font: [Serif - distinctive but professional]
   - Body Font: [Sans-serif - highly readable]
   - Size scale: H1-H3, Body, Small, Caption
   - Weights: Light, Regular, SemiBold, Bold
   
3. Spacing System
   - Base: 8px grid
   - Scale: 8, 16, 24, 32, 48, 64, 80
   
4. Components
   - Buttons (primary, secondary, danger)
   - Form inputs
   - Data cards
   - Tables
   - Alerts/Badges
   
5. Interactive States
   - Hover: Subtle, purposeful
   - Focus: Clear, accessible
   - Active: Visual feedback
   
6. One Signature Detail
   - [Add 1 memorable, intentional design choice that makes it custom]

Explain the philosophy behind each choice.
```

### Template D: Styling Specific Component

```
Style my [COMPONENT TYPE] for a government data platform.

CONTEXT:
- Component purpose: [What does it do?]
- Users: [Who sees it? Non-technical citizens? Analysts?]
- Data type: [What kind of data does it show?]
- Tone: Professional, trustworthy, clear

CURRENT STATE:
[Paste your code here]

DESIRED OUTCOME:
- Clear visual hierarchy
- Accessible (high contrast, readable)
- Fits within design system: [serif headers, sans-serif body, primary color X, accent color Y]
- Professional, not trendy
- Explain your design choices

SPECIFIC REQUESTS:
- Typography: [Use serif/sans-serif, specific sizes]
- Colors: [Use primary/accent from system]
- Spacing: [Generous, clear separation]
- Interactive states: [Hover, focus, active]
- One detail that makes it feel intentional: [Not random decoration]

Include CSS/Tailwind, reasoning, and hover/focus states.
```

### Template E: Typography Pairing

```
Help me choose fonts for my citizen security data platform.

CURRENT: [Your current fonts]
PROBLEM: [Feels too generic, doesn't convey trust, etc.]

REQUIREMENTS:
- Headers: Distinctive serif OR strong sans-serif (conveys authority)
- Body: Highly readable sans-serif
- Max 2 fonts total
- Must feel handcrafted, not default
- Support government data credibility

CONTEXT:
- Government/civic data platform
- Non-technical users + data analysts
- Professional, trustworthy tone
- Editorial (journalism-inspired) aesthetic

AVOID: Inter, Roboto, Poppins, Space Grotesk

SUGGEST:
Header fonts to consider: Merriweather, EB Garamond, Crimson Text, Playfair Display, Lora
Body fonts to consider: Public Sans, DM Sans, Sohne, Atlas Grotesk, Grotesk

Please recommend a pairing with reasoning for WHY these fonts work for this platform.
```

### Template F: Color Palette & Meaning

```
Help me create a semantic color palette for my security data platform.

WHAT COLORS MEAN IN MY CONTEXT:
- Red/Danger: Security incidents, high-crime areas
- Green/Safe: Low incident areas, positive trends
- Neutral: General data, baseline information
- Accent: Important CTAs, highlights

CURRENT PALETTE: [Your current colors]
PROBLEM: [Feels generic, doesn't convey meaning, uses too many colors, etc.]

REQUIREMENTS:
- 5-7 colors maximum
- Each color has MEANING in data context
- Professional, not playful
- High contrast for accessibility
- Tie to institutional credibility

CREATE:
1. Primary color: [Institutional, strong contrast]
2. Secondary color: [Support]
3. Accent color: [CTAs, highlights]
4. Danger: [Red-based, for alerts]
5. Success: [Green-based, for safety]
6. Neutrals: [Grays, 3-4 shades]

AVOID: Purple/pink gradients, rainbow, every color equally important

Please provide hex values and explain why each color choice works for government security data.
```

---

## 🎨 Font Recommendations (Handcrafted Feel)

**Avoid (Overused):**
- Inter, Roboto, Poppins, Space Grotesk, San Francisco, Segoe

**Serif Headers (Authority):**
- Merriweather (elegant, readable serif)
- EB Garamond (sophisticated, classic)
- Crimson Text (editorial, elegant)
- Playfair Display (strong, institutional)
- Lora (modern serif with personality)

**Sans-Serif Body (Readability):**
- Public Sans (open source, government-friendly)
- DM Sans (friendly, professional)
- Sohne (refined, designed for readability)
- Atlas Grotesk (crafted, unique)
- Grotesk (warm geometric)

**Rule:** 1 display font + 1 body font = intentional, not scattered

---

## 🎯 Color Palette Recipes

### Option 1: Institutional Authority
```
Primary: #1a3a52 (Deep Navy)
Secondary: #475569 (Warm Slate)
Accent: #dc2626 (Ember Red)
Success: #15803d (Forest Green)
Danger: #7f1d1d (Dark Red)
Neutrals: #f5f5f5, #e5e5e5, #a3a3a3, #525252, #1f2937
```

### Option 2: Data-Focused
```
Primary: #1f2937 (Charcoal)
Secondary: #0f766e (Steel Teal)
Accent: #d97706 (Gold)
Success: #0d9488 (Emerald)
Danger: #dc2626 (Red)
Neutrals: #fafafa, #f3f4f6, #9ca3af, #6b7280, #374151
```

### Option 3: Modern Trustworthy
```
Primary: #334155 (Slate)
Secondary: #4338ca (Indigo)
Accent: #f59e0b (Amber)
Success: #10b981 (Green)
Danger: #e11d48 (Rose)
Neutrals: #ffffff, #f8fafc, #cbd5e1, #64748b, #1e293b
```

---

## 📋 Design Checklist: "Does It Feel Handcrafted?"

✅ **Typography**
- [ ] Headers: Distinctive serif OR strong sans-serif
- [ ] Body: Highly readable sans-serif
- [ ] Pairing has clear reasoning
- [ ] Font sizes follow consistent scale

✅ **Color**
- [ ] Primary color: Strong, has purpose
- [ ] Accent color: Used purposefully (not everywhere)
- [ ] Each color: Semantic meaning in data
- [ ] Limited palette: 5-7 colors max

✅ **Spacing**
- [ ] Generous whitespace (breathable)
- [ ] Consistent 8px grid
- [ ] Clear content hierarchy

✅ **Interactive States**
- [ ] Hover: Subtle, refined
- [ ] Focus: Clear, accessible
- [ ] Active: Visual feedback
- [ ] Loading: If needed, minimal animation

✅ **Signature Detail**
- [ ] One memorable choice
- [ ] Feels intentional, not random
- [ ] Consistent throughout

✅ **Overall Feel**
- [ ] Could explain EVERY design choice
- [ ] Professional, not trendy
- [ ] Accessible (WCAG AA)
- [ ] Doesn't look like template

---

## 🚀 Workflow: Step-by-Step

1. **Phase 1: Typography** (Foundation)
   - Pick serif for headers: _____
   - Pick sans-serif for body: _____
   - Apply to ALL text
   - Use only 2 fonts total

2. **Phase 2: Color System** (Meaning)
   - Define what colors mean in your data
   - Create 6-7 color palette
   - Tie to data: red=alert, green=safe, etc.
   - Create CSS variables

3. **Phase 3: Spacing Rhythm** (Structure)
   - Define 8px grid
   - Create spacing scale: 8, 16, 24, 32, 48, 64, 80
   - Apply consistently everywhere
   - Generous padding = breathable

4. **Phase 4: Component Design** (Details)
   - Redesign data tables (professional, scannable)
   - Design cards (minimalist, clear)
   - Style buttons (clear hierarchy)
   - Create hover/focus states

5. **Phase 5: Signature Detail** (Memory)
   - Add ONE intentional design element
   - Make it consistent
   - Something memorable about THIS platform

---

## 🎭 Tone Descriptors for Prompts

Use these to guide Claude:

- **Professional:** Government credibility, formal, clear
- **Accessible:** Non-technical users understand it
- **Editorial:** Journalism-inspired clarity, respects typography
- **Institutional:** Trustworthy, authoritative, serious
- **Minimalist:** Generous space, only essential elements
- **Refined:** Polished, careful details, nothing accidental
- **Intentional:** Every choice has purpose

**NOT:** Playful, trendy, bright, cheerful, generic, template-like, AI-generated

---

## 📸 What "Handcrafted" Looks Like

✅ **Distinctive typography pairing** → Merriweather + Public Sans
✅ **Semantic colors with purpose** → Red means alert, green means safe
✅ **Consistent spacing system** → Always 8, 16, 24, 32 (never random)
✅ **Clear data hierarchy** → Visual weight shows importance
✅ **Subtle interactive states** → Hover changes, but stays refined
✅ **One signature detail** → Accent border on data cards, unique icon treatment, etc.
✅ **High accessibility** → Clear focus states, high contrast, readable
✅ **No decoration without purpose** → Every element serves function

❌ **Generic fonts** → Inter, Roboto everywhere
❌ **Random colors** → Purple/pink gradients, rainbow palettes
❌ **Inconsistent spacing** → No clear grid, random paddings
❌ **Trendiness** → Glassmorphism, neumorphism, heavy animations
❌ **Template vibes** → Looks like every other SaaS dashboard
❌ **Scattered micro-interactions** → Animation everywhere, no purpose
❌ **Decoration for its own sake** → Gradient backgrounds, floating shapes

---

## 🔥 "Emergency Fix" Prompt

Use this if your design feels generic:

```
My Next.js platform looks too templated. FIX IT NOW.

CHANGE 1: Typography
Current: [Your fonts]
New: [Serif header] + [Sans-serif body] that feels handcrafted, not default
Reason: [Why this pairing works for government data]

CHANGE 2: Color
Current: [Muted, uninspired]
New: Semantic palette with PRIMARY + ACCENT + meaningful secondary colors
Reason: [Each color means something in data context]

CHANGE 3: Details
Add: [1 intentional design element that makes it memorable]
Example: Accent color top border on data cards, custom icon sizing, unique spacing rhythm

Don't: Keep anything that looks like Tailwind defaults or SaaS templates
Do: Make it feel custom-built for THIS platform

Show me the updated code and explain your reasoning.
```

---

## 📝 Example Completed Prompt (You Can Adapt)

```
I'm styling a dashboard card for my citizen security platform (Next.js + Tailwind).

COMPONENT: Dashboard card showing security incident statistics
DATA: City name, incident count, trend (up/down), severity level

CONTEXT:
- Users: Non-technical citizens checking their neighborhood safety
- Tone: Professional, trustworthy, not alarming but honest
- Part of larger system using:
  - Headers: Merriweather (serif)
  - Body: Public Sans (sans-serif)
  - Primary: Deep Navy (#1a3a52)
  - Accent: Ember Red (#dc2626)
  - Success: Forest Green (#15803d)

DESIGN THIS CARD:
1. Title: Merriweather Bold, 18px
2. Data display: Large number (incident count) with semantic color
   - High incidents: Red tint
   - Low incidents: Green tint
3. Trend indicator: Arrow + percentage, small
4. Bottom border: Accent color 2px (signature detail)
5. Hover: Subtle shadow increase, no background change
6. Focus: Clear outline on card

Requirements:
- Professional, not playful
- Accessible (high contrast)
- Clear hierarchy (number > trend > label)
- Generous padding (24px)
- Explain color choices

Include Tailwind CSS and hover/focus states.
```

---

## 💼 When Working with Claude Code

**DO:**
- Paste your current code
- Be specific about what feels wrong
- Ask for reasoning behind choices
- Request multiple options
- Iterate on feedback

**DON'T:**
- Ask for "something beautiful" (be specific)
- Use generic terms like "modern" or "sleek"
- Copy-paste templates
- Avoid making design decisions
- Add decoration without purpose

**GOOD:** "Style this table for readability. Make headers Merriweather, body Public Sans. Explain color contrast choices."

**BAD:** "Make this look better and more modern."

---

## 🎯 Final Reminder

Your design is INTENTIONAL when:
- You can explain EVERY color choice
- Fonts are chosen for specific reasons
- Spacing follows a grid system
- No decorative elements exist
- Professional tone matches mission
- Non-technical users understand data
- It doesn't look like any template

**Your mantra:** "I designed this for government security data transparency. Every choice supports that mission."

---

**Happy styling! 🚀**
