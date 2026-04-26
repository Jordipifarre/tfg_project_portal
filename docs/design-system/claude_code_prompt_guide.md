# Claude Code Prompt Guide: Citizen Security Data Platform UI/UX

## Overview
This guide provides you with optimized prompts to use with Claude Code for styling your Next.js frontend to achieve a professional, trustworthy, and human-designed aesthetic that supports your civic transparency platform.

---

## Core Design Strategy

Your platform tackles **civic engagement and public security transparency**. The design must communicate:
- **Trust & Credibility**: Government/institutional data requires seriousness
- **Accessibility**: Data must be understandable to non-technical citizens
- **Human-Centered**: The inverse of "AI-generated" is intentional, thoughtful design with clear purpose
- **Clarity Over Trend**: Timeless, functional design that prioritizes content and user intent

---

## Key Anti-Patterns to Avoid

❌ **DO NOT mention or use:**
- Purple/pink gradients
- Generic Tailwind component collections (shadcn/ui default styles)
- "Modern" overused fonts (Inter, Space Grotesk, Roboto)
- Excessive animations that don't serve purpose
- Neumorphic or glassmorphism effects
- Generic SaaS dashboard templates
- Bright, playful colors for serious data
- Thin typography with low contrast
- Floating elements for decoration

---

## Prompt Template 1: Initial UI/UX Styling (Comprehensive)

Use this when you want to style entire sections or the whole application:

```
I'm building a citizen security data transparency platform with Next.js. 
The platform has three main interaction modes:
1. Manual exploration (tables and articles)
2. Interactive dashboards (charts and visual analysis)
3. AI-powered chat assistant (natural language queries)

**Design Requirements:**
- Create a design system that feels INTENTIONAL and HUMAN-MADE, not AI-generated
- Avoid generic SaaS dashboard aesthetics
- The design should communicate TRUST and institutional credibility (it's serving public security data)
- Make data the hero - typography and layout should prioritize readability and clarity
- Ensure the AI chat doesn't dominate; it should feel like a natural tool, not the star

**Aesthetic Direction:**
- Tone: Professional, accessible, editorial (journalism-inspired clarity)
- Color palette: Start with a strong primary color + neutral grays, with a single accent for CTAs/alerts
- Typography: Use a distinctive serif display font for headers (convey authority) + readable sans-serif for body (ensure accessibility)
- Spacing: Generous whitespace, aligned to a clear grid system
- Visual Details: Subtle borders, careful use of shadows for depth, restrained iconography

**Specific Elements to Style:**
1. Header/Navigation: Clear hierarchy, institutional feeling
2. Data Tables: Professional, scannable, with clear visual separation
3. Dashboard Cards: Minimalist, with clear data hierarchy
4. Charts: Clean lines, meaningful colors tied to data meaning (red=danger, green=safe, etc.)
5. Chat Interface: Sidebar or modal, doesn't overpower other content
6. Article/Content Section: Editorial layout, respects typography hierarchy

**Technical Details:**
- Framework: Next.js with React
- Styling: [Tailwind CSS / CSS-in-JS / styled-components - choose your current approach]
- No heavy icon libraries; use 24-25px stroke width icons from Lucide React
- Mobile-first responsive design (min-width: 375px)
- Accessibility: WCAG AA compliant, semantic HTML

**What I DON'T want:**
- Anything that looks like a template
- Playful or trendy elements
- Bright, saturated colors
- Generic dashboard components
- Auto-generated design patterns

Please style [SPECIFIC COMPONENT/SECTION] with this philosophy in mind. Focus on:
- Typography choices with reasoning
- Color palette with hex values
- Spacing system (scale ratios)
- Subtle interactive states (hover, focus, active)
- One memorable visual detail that feels intentional, not random
```

---

## Prompt Template 2: Specific Component Styling

Use this for individual components or sections:

```
I need help styling a [COMPONENT NAME] for my citizen security data platform.

**Context:**
- The platform displays public security statistics and trends
- Users include non-technical citizens and data analysts
- The tone is professional and trustworthy, NOT trendy or playful

**Current Component Purpose:**
[Describe what the component does and why it matters to users]

**Design Principles I want:**
- Looks intentionally designed, not AI-generated
- Clear visual hierarchy
- Respects white space
- Typography that's readable at all sizes

**Specific Design Requests:**
1. Color: Use [dominant color] for this component, keeping consistency with [other elements]
2. Typography: Apply [serif/sans-serif] for headers, [readable font] for body text
3. Spacing: Generous padding, clear separation between sections
4. Interactive states: Subtle hover/focus states that feel refined

**Technical Context:**
- Built with Next.js + React
- Using Tailwind CSS for styling
- Must be responsive (mobile-first)

Please create this component with:
- Detailed CSS/Tailwind classes
- Clear visual hierarchy
- Explanation of design choices
- Hover/focus states
```

---

## Prompt Template 3: Design System & Style Guide

Use this to establish consistent styling across the whole application:

```
Help me create a design system/style guide for my Next.js citizen security data platform.

**Application Overview:**
- Purpose: Make government security data accessible to citizens
- Three interaction modes: manual browsing, visual dashboards, AI chat
- Users: Non-technical citizens + data analysts

**Design Constraints:**
- Must feel INTENTIONAL and PROFESSIONAL, not generic/AI-generated
- Must prioritize ACCESSIBILITY and CLARITY over trendiness
- Should work for both desktop and mobile
- Should communicate TRUST and institutional credibility

**Create for me:**
1. **Color System**
   - Define 5-7 colors maximum (primary, secondary, success, warning, danger, neutral set)
   - Provide hex values
   - Explain the semantic meaning (e.g., red = security concern)

2. **Typography System**
   - Header font: [serif/sans-serif] - distinctive but professional
   - Body font: [highly readable sans-serif]
   - Size scale: H1, H2, H3, Body, Small, Caption
   - Weights to use: Light, Regular, Semibold, Bold
   - Reasoning for each choice

3. **Spacing & Grid**
   - Base unit: 4px or 8px
   - Provide spacing scale (xs, sm, md, lg, xl)
   - Grid system (12-column recommended)

4. **Component Patterns**
   - Buttons: primary, secondary, danger styles
   - Form inputs: styling for text, select, textarea
   - Cards: for data display, elevation/shadows
   - Tables: professional data table styling
   - Alerts/Badges: for security status indicators

5. **Micro-interactions**
   - Hover states (buttons, links, cards)
   - Focus states (form inputs, interactive elements)
   - Loading states
   - One or two carefully chosen animations for key moments (not scattered)

6. **One Signature Detail**
   - One memorable, intentional design choice that makes this feel custom-built
   - Examples: unique border treatment, custom accent color combo, typography pairing, icon system

**Visual References:**
- Avoid: SaaS dashboard templates, Material Design, Bootstrap defaults
- Inspiration directions: Editorial design, government websites (trustworthy), data journalism layouts
```

---

## Prompt Template 4: Avoiding AI-Generated Aesthetics

Use this if you notice your design starting to look generic:

```
My Next.js platform is starting to look too generic/AI-generated. Help me fix it.

**What feels generic:**
- [List specific elements: "buttons look like every SaaS", "colors are muted and uninspired", etc.]

**What I want instead:**
- Design that feels HANDCRAFTED and INTENTIONAL
- Clear point-of-view (not trying to please everyone)
- Professional but with personality
- Trustworthy without being boring

**Specific Changes:**
1. **Typography**: Replace generic fonts with distinctive choices
   - Current: [your current fonts]
   - New direction: [serif for display? unique sans-serif?]

2. **Color Palette**: Make it less safe, more intentional
   - Current: [describe current palette]
   - Direction: [stronger primaries? unexpected accent?]

3. **Visual Elements**: Add intentional details
   - Subtle textures or patterns
   - Meaningful use of borders/lines
   - Custom icon style or icon set

4. **Layout**: Make it less predictable
   - Current: [describe current layout issues]
   - New approach: [asymmetry? varied card sizes? unique section dividers?]

**Key Principle:**
Instead of adding MORE decoration, focus on:
- Exceptional typography choices
- Thoughtful color relationships
- Generous, intentional whitespace
- Refined interactive states
- Clear information hierarchy

Please help me redesign [SPECIFIC SECTION] to feel more intentional and custom-built.
```

---

## Prompt Template 5: Tone & Brand Voice (Through Design)

Use this to align visual design with your platform's mission:

```
Help me make my platform's VISUAL DESIGN match its mission and values.

**Platform Mission:**
Democratize access to citizen security data through transparent, AI-assisted exploration.

**Key Values:**
- Transparency: Nothing hidden, clear data sources
- Accessibility: Works for non-technical users
- Trust: Government/institutional credibility
- Intelligence: Powered by AI but not dominated by it
- Citizen-Centric: Puts people's needs first

**How should the design reflect these?**

1. **Transparency** → Visual Design Choice:
   - Clear data sources and citations always visible
   - No hidden complexity
   - Suggest: Prominent attribution, visible data flow, clear documentation

2. **Accessibility** → Visual Design Choice:
   - High contrast, readable typography
   - Generous spacing, clear hierarchy
   - No reliance on color alone to convey meaning
   - Suggest: WCAG AA+ compliance, clear visual indicators

3. **Trust** → Visual Design Choice:
   - Professional, not trendy
   - Institutional credibility without being stuffy
   - Suggest: Serif headers, restrained color palette, clear branding

4. **Intelligence** → Visual Design Choice:
   - AI features feel natural, not forced
   - Chat fits in, doesn't dominate
   - Suggest: Subtle visual cues, natural conversation flow, same design language as other tools

5. **Citizen-Centric** → Visual Design Choice:
   - Design for clarity, not complexity
   - Data presented for understanding, not impressing
   - Suggest: Clear CTAs, intuitive navigation, multiple ways to explore

Please review my [COMPONENT/PAGE] and suggest visual changes that better reflect these values.
```

---

## Best Practices for Each Component Type

### Data Tables
```
Style the data table to feel professional and scannable:
- Strong header styling with clear column hierarchy
- Alternating row backgrounds (subtle: #f9f9f9 vs white)
- Hover states that highlight entire row
- Clear typography: headers slightly bolder than data
- Generous horizontal padding
- Right-aligned numbers for easy comparison
- Avoid: Full borders on every cell, colorful row highlighting, decorative icons
```

### Charts & Visualizations
```
Make charts feel intentional, not auto-generated:
- Color palette tied to data meaning (not rainbow defaults)
- Labels integrated naturally, not floating
- Minimal gridlines (grid-on-dark background only if needed)
- One accent color for highlighting important trends
- Legend positioned thoughtfully (not always bottom-right)
- Tooltips with clear, readable typography
- Avoid: 3D effects, gradient fills, chart junk
```

### Navigation & Headers
```
Create institutional-feeling navigation:
- Clear logo/branding treatment (text or simple mark)
- Navigation items with clear active state (underline or background)
- Generous vertical padding (48-56px)
- Subtle border or background to separate from content
- Search feature if applicable, positioned logically
- Avoid: Centered alignment, playful icons, complex mega-menus
```

### Chat Interface
```
Make AI chat feel like a natural tool, not the star:
- Position as sidebar (right) or collapsible panel
- Use same typography system as rest of app
- Chat bubbles: simple background colors, readable text
- Input field: clear focus state, visible submit button
- Sources/citations: always visible and clickable
- Avoid: Typing animations (unless very subtle), emoji, casual tone indicators
```

---

## Typography Recommendations

**Avoid (overused in AI design):**
- Inter, Roboto, Poppins, Space Grotesk
- System fonts (San Francisco, Segoe)

**Consider Instead:**

**Serif (Headers/Display):**
- Crimson Text (elegant, editorial)
- EB Garamond (sophisticated, classic)
- Playfair Display (strong, institutional)
- Merriweather (readable serif with personality)
- Lora (modern serif, reliable)

**Sans-Serif (Body/UI):**
- Sohne (refined, designed for readability)
- Grotesk (geometric but warm)
- Atlas Grotesk (unique, crafted)
- DM Sans (friendly professional)
- Public Sans (government-designed, open source)

**Rule:** Pick ONE distinctive display font + ONE reliable body font. Don't mix more than 2 fonts total.

---

## Color Palette Recommendations

Instead of purple/pink generic gradients, consider:

**Option 1: Institutional/Authority**
- Primary: Deep Navy (#1a3a52)
- Secondary: Warm Slate (#475569)
- Accent: Ember Orange (#dc2626 or #f97316)
- Danger: Red (#7f1d1d)
- Success: Forest Green (#15803d)
- Neutral: Careful grays (#f5f5f5 to #1f2937)

**Option 2: Data-Focused/Technical**
- Primary: Charcoal (#1f2937)
- Secondary: Steel Blue (#0f766e)
- Accent: Gold (#d97706)
- Danger: Bright Red (#dc2626)
- Success: Teal (#0d9488)
- Neutral: Clean grays (#fafafa to #374151)

**Option 3: Modern/Trustworthy**
- Primary: Slate (#334155)
- Secondary: Indigo (#4338ca)
- Accent: Amber (#f59e0b)
- Danger: Rose (#e11d48)
- Success: Emerald (#10b981)
- Neutral: Crisp whites (#ffffff to #94a3b8)

---

## Sample "Intentional Design" Details

These are the kinds of details that make design feel handcrafted:

1. **Typography Pairing:**
   - Merriweather (headers) + Public Sans (body) = feels governmental and accessible

2. **Accent Color System:**
   - Not using every accent for decoration; reserve colors for meaning (red=alert, green=safe)

3. **Border Treatment:**
   - Consistent 1px borders on data containers, not shadows
   - Accent color subtle top border on key sections

4. **Spacing Rhythm:**
   - Consistent spacing scale (8, 16, 24, 32, 48px) throughout
   - Generous padding around content creates breathing room

5. **Interactive States:**
   - Hover: Subtle background change + shift letter-spacing slightly
   - Focus: Clear outline with your accent color
   - Active: Underline or left border in accent color

6. **Icon System:**
   - All from Lucide React, consistent 24px size
   - Stroke weight 1.5px (not variable)
   - Color: Inherit text color (not separate color)

---

## Red Flags: When Your Design Feels AI-Generated

❌ "Everything looks like Tailwind defaults"
→ Solution: Custom color palette, distinctive typography, intentional spacing

❌ "It's pretty but I can't explain why"
→ Solution: Add intentional details with purpose (not decoration for decoration)

❌ "It looks like every other SaaS dashboard"
→ Solution: Commit to a specific aesthetic (minimalist AND refined, or maximalist AND controlled)

❌ "Colors feel safe but uninspired"
→ Solution: Use a semantic color system tied to your data meaning

❌ "Layout is predictable and symmetrical"
→ Solution: Add asymmetry, unexpected column widths, varied card sizes

❌ "Fonts are generic and interchangeable"
→ Solution: Choose distinctive fonts with clear reasoning

---

## Actionable Next Steps

1. **Start with Typography:**
   - Choose ONE distinctive serif for headers
   - Choose ONE reliable sans-serif for body
   - Apply consistently across all components

2. **Establish Color Meaning:**
   - Decide: What does each color mean in your data?
   - Create a semantic color system
   - Apply consistently (red=danger, green=safe, etc.)

3. **Create Spacing System:**
   - Define a base unit (8px recommended)
   - Stick to it: 8, 16, 24, 32, 48, 64, 80
   - Use consistently for padding, margins, gaps

4. **Design One Component Well:**
   - Take data tables or a dashboard card
   - Design it with clear intentionality
   - Document design decisions
   - Replicate this thoughtfulness across others

5. **Add One Signature Detail:**
   - Think about what makes YOUR platform unique
   - Add ONE visual element that reflects that
   - Example: A subtle accent border on data containers
   - Make it consistent, never random

---

## Using These Prompts with Claude Code

**Best Practices:**

1. **Be Specific About What Exists:**
   ```
   "I have a Next.js component that currently shows [CURRENT STATE]. 
   I want to style it to look [DESIRED STATE]. Here's my current code: [PASTE CODE]"
   ```

2. **Provide Context:**
   ```
   "This component is for [PURPOSE] and will be seen by [USER TYPE]. 
   The overall app uses [DESCRIBE DESIGN SYSTEM]. Please ensure this component fits."
   ```

3. **Request Design Reasoning:**
   ```
   "Explain your design choices: Why this color? Why this font? 
   Why this spacing? Help me understand the intentionality."
   ```

4. **Iterate Responsibly:**
   ```
   "The design feels [PROBLEM]. Can we adjust by [DIRECTION]? 
   Keep [WHAT WORKS], change [WHAT DOESN'T]."
   ```

5. **Ask for Alternatives:**
   ```
   "Show me 2-3 different styling approaches for this component. 
   Explain the trade-offs and which feels most intentional for our platform."
   ```

---

## Final Checklist: "Does This Feel Human-Designed?"

✅ **Typography:**
- [ ] Display font is distinctive (not Inter/Roboto)
- [ ] Body font is highly readable
- [ ] Font pairing has clear reasoning
- [ ] Weights and sizes follow a coherent scale

✅ **Color:**
- [ ] Primary color has strong contrast
- [ ] Accent color is used purposefully (not everywhere)
- [ ] Each color has semantic meaning in data
- [ ] Palette is limited (5-7 colors max)

✅ **Spacing:**
- [ ] White space feels generous, not cramped
- [ ] Spacing follows consistent scale
- [ ] Content hierarchy is clear through spacing

✅ **Details:**
- [ ] Hover states are subtle and refined
- [ ] Focus states are clear (accessible)
- [ ] No decorative elements without purpose
- [ ] Icons are consistent style and size

✅ **Overall Feel:**
- [ ] Design is intentional (could explain every choice)
- [ ] Platform feels trustworthy for civic data
- [ ] Accessibility is clearly prioritized
- [ ] Design doesn't copy templates or trends

---

## Quick Reference: When Using Claude Code

Save these short prompts for quick styling tasks:

```
"Style this [COMPONENT] for a government data platform. 
Make it professional, not trendy. Use serif headers, 
clear hierarchy, and restrained colors. Explain choices."
```

```
"This looks too generic. Make it feel handcrafted. 
Change the fonts, commit to an aesthetic, add one 
intentional design detail that makes it memorable."
```

```
"Create a design system with: color palette (semantic), 
typography (2 fonts max), spacing scale, and component 
patterns. Make it feel institutional and trustworthy, not trendy."
```

---

**Remember:** The best design doesn't look AI-generated because it has INTENTIONALITY behind every choice. You can explain why each color, font, and spacing decision matters for your specific platform's mission.

Good luck with your citizen security transparency platform! 🚀
