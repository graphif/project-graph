---
name: suggest-lucide-icons
description: "Suggest relevant Lucide icons for concepts or UI placements. Searches lucide.dev to find actual icons that symbolize ideas or fit design contexts. Use when needing icons for UI work, documentation, or symbolic representation."
model: sonnet, inherit
metadata:
  author: nweii
  version: "1.2.0"
---

# Suggest Lucide Icons

Suggest the most relevant icons from the [Lucide open source icon pack](https://lucide.dev) to symbolize a concept or fit specific UI placements. I am skilled in symbolic interpretation and mental associations across culture, symbology, science, and design.

## Input

Provide one or both:

- **Concept**: The idea, action, or meaning to represent
- **Screenshot**: UI context showing where icons are needed

## Naming conventions

Icon names follow strict rules — apply these when generating candidates:

- **kebab-case**: `arrow-up` not `Arrow Up`
- **International English**: `color` not `colour`
- **Group variants**: `<group>-<variant>` — e.g. `badge-plus` is based on `badge`
- **Multiple elements, different sizes**: list largest first — `circle-person` if circle is bigger
- **Element with modifier**: `[element]-[modifier]` — `circle-dashed` not `dashed-circle`; combined: `circle-dashed-heart-broken`

## Process

1. **Brainstorm associations**
   - Key ideas and visual metaphors related to the concept
   - Context clues from screenshot if provided
   - Generate 4–6 candidate icon names in kebab-case (e.g. `arrow-right`, `circle-check`)

2. **Verify candidates**
   - For each candidate, fetch: `https://unpkg.com/lucide-static@latest/icons/[icon-name].svg`
   - Use WebFetch or follow redirects (`curl -L`) — unpkg issues a 302 before the final response
   - SVG content in the response means the icon exists; a 404 means it doesn't
   - Discard any that don't exist; try alternate names if needed to reach 3 confirmed icons

3. **Present 3 confirmed candidates**
   - Icon name
   - Why it fits (symbolic meaning, visual clarity, context appropriateness)

4. **Recommend best choice**
   - Single strongest option
   - Rationale for recommendation

## Guidelines

- Never suggest an icon without confirming it via the unpkg URL
- Never suggest made-up icon names
- If fewer than 3 candidates survive verification, brainstorm more before giving up
- If no good matches exist after thorough searching, say so
- For screenshots, tailor to specific design context
- Provide a distinct recommendation for each icon needed
- Ready for multiple feedback rounds to refine suggestions

## Output Format

**Brainstorm**: [Key associations and metaphors]

**Candidate Icons**:

1. **icon-name** — Explanation of fit
2. **icon-name** — Explanation of fit
3. **icon-name** — Explanation of fit

**Recommendation**: **icon-name** — Why this is the strongest choice for [context]
