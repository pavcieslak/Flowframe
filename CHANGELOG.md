# Changelog

All notable changes to Flowframe are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [1.1.0] – 2026-11-11
### Changed
- **Direction** and **Align** controls are now Figma-style icon buttons.
- The alignment icons follow the layout direction: left / centre / right for vertical layouts, and top / middle / bottom for horizontal layouts.
- Added tooltips to the icon buttons.

## [1.0.1] – 2026-11-11
### Fixed
- Gap, padding and fixed width and height now apply when you press **Enter**, as well as on Tab and blur. UXP number inputs didn't reliably fire `change` on Enter.
- A comma is accepted as the decimal separator (`12,5` is read as 12.5).
- The panel no longer overwrites a field while you're typing in it.

## [1.0.0] – 2026-11-11
### Added
- First release: Figma-style auto layout for InDesign groups.
- Settings: direction, gap, spacing (packed or space-between), cross-axis alignment, padding on each side, hug or fixed width and height.
- Background frame that resizes with the layout.
- Options for a child item: fill container, ignore auto layout (absolute), use as background, hug text.
- Nested auto layouts, ordering by position, optional auto-reflow, and one undo step per change.

[1.1.0]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.1.0
[1.0.1]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.0.1
[1.0.0]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.0.0
