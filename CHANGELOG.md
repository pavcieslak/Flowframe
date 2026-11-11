# Changelog

All notable changes to Flowframe are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [1.2.5] – 2026-11-11
### Changed
- Align buttons now use text labels instead of icons, because UXP in InDesign didn't render the icons. The labels follow the direction: **Left / Centre / Right** for vertical layouts and **Top / Middle / Bottom** for horizontal ones.

## [1.2.4] – 2026-11-11
### Fixed
- Align icons were still invisible in InDesign. Each button now holds a single image, swapped when the direction changes; UXP didn't render images nested in hidden or visible spans inside buttons.
- The padding fields overflowed narrow panels. They now use fixed percentage widths.
- Width and height values display without padded decimals.

## [1.2.3] – 2026-11-11
### Added
- Plugin icon: a gradient tile showing stacked items in a frame with gap markers. It appears in the Creative Cloud app and the Plugins panel.
- A new panel tab icon to match.
- Source SVGs and PNG exports in `docs/brand/`.

## [1.2.2] – 2026-11-11
### Fixed
- The panel now works when docked narrow: fields, dropdowns and buttons shrink and wrap instead of overflowing the panel. Tested down to 200 px wide.
- Shorter labels ("Remove", "Reflow all on spread"); units are shown once, in the Layout heading.

## [1.2.1] – 2026-11-11
### Fixed
- The Direction and Align icons were invisible in InDesign, because UXP doesn't render inline SVG inside buttons. They are now PNG images, with @2x versions for sharp displays.
- Hugged width and height are shown with at most one decimal place, so the value fits in the field.

## [1.2.0] – 2026-11-11
### Added
- Menu commands under **Plugins → Flowframe**: *Add auto layout*, *Remove auto layout*, *Reflow selected auto layout* and *Reflow all on this spread*. You can assign keyboard shortcuts to them in **Edit → Keyboard Shortcuts**, e.g. <kbd>Shift</kbd>+<kbd>A</kbd> as in Figma.

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

[1.2.5]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.2.5
[1.2.4]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.2.4
[1.2.3]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.2.3
[1.2.2]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.2.2
[1.2.1]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.2.1
[1.2.0]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.2.0
[1.1.0]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.1.0
[1.0.1]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.0.1
[1.0.0]: https://github.com/pavcieslak/Flowframe/releases/tag/v1.0.0
