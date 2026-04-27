# Changelog

All notable changes to the `suggest-lucide-icons` skill.

Format: [Keep a Changelog](https://keepachangelog.com)

## [1.2.0]

### Added

- Naming conventions section to guide candidate generation (kebab-case, international English, compound element ordering)
- Verification step: each candidate icon is confirmed via unpkg static SVG URL before being suggested
- Note about following redirects when fetching from unpkg

### Changed

- Replaced unreliable lucide.dev SPA scraping with per-candidate unpkg URL verification
- Process now generates 4–6 candidates then discards unverified ones rather than searching a rendered page

### Removed

- "Depiction over use case" naming rule (examples like `floppy-disk` don't reflect existing icons)
- "No numerals" and "alternate icons" rules (contributor guidelines that could block valid legacy icon names)

## [1.0.0]

### Added

- Initial skill migrated from `suggest-lucide-icons.md` command
