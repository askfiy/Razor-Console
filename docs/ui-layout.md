# Console layout and density

The desktop workspace and detail drawer use the same root `--ui-scale` and
rem-based density tokens. Screen orientation changes composition, not the size
of the app header. The native Windows title bar is outside this layout.

## References and choices

- [Fluent layout](https://fluent2.microsoft.design/layout): use a 4px spacing
  ramp, consistent alignment, and proximity to group related controls.
- [Carbon grid](https://carbondesignsystem.com/elements/2x-grid/overview/):
  distinguish fixed-height toolbars from fluid content regions.
- [Carbon shell header](https://carbondesignsystem.com/components/UI-shell-header/style/):
  the 48px header is a useful baseline for this desktop tool.

These references inform the choices below; the exact combination is specific
to Razor. A golden ratio is not used to calculate form rows or toolbar heights.

## Shared sizes

Values below are CSS pixels before the existing global UI scale is applied.

| Element | Default | Height <= 800 | Height <= 700 |
| --- | ---: | ---: | ---: |
| App header | 48 | 48 | 48 |
| Panel title / output tabs | 44 | 44 | 44 |
| Profile / output toolbar | 40 | 40 | 40 |
| Setting row, workspace and drawer | 48 | 44 | 40 |
| Select / numeric input / toolbar button | 32 | 28 | 28 |
| Key chip / Add button | 24 | 24 | 24 |

The root scale ranges from 0.85 to 1 on desktop, so the visible app header is
about 41–48px. Detail rows can grow when translated labels or collections wrap;
single-value rows share the same minimum height as the workspace. The drawer
header includes a breadcrumb and title, so it uses a separate content allowance.

## Typography and spacing

All text roles have an explicit size/line-height pair; portrait uses the same
roles as landscape. Values below are before UI scaling.

| Role | Font size / line height |
| --- | --- |
| Page title | 24 / 32 |
| Drawer title | 20 / 28 |
| Section title / brand | 16 / 24 |
| Panel and card title | 14 / 20 |
| Body | 13 / 20 |
| Form label / control / description | 12 / 16 |
| Compact caption / key chip | 11 / 16 |
| Technical identifier | 10 / 12 |

Spacing declarations use the root `--space-*` ramp. Common values are 4, 8,
12, 16, 20, 24 and 32px. The 2px half-step is reserved for optical alignment,
such as the gap to a technical identifier. Keep geometric values (image aspect
ratio, column width, card height and screen insets) separate from spacing tokens.
Rectangular controls share a 4px radius, and all toggles share a 28×16px size.

Ordinary fields use the same row minimum throughout the workspace, core settings,
component settings, controller grid, and startup settings. Nested records use
stacked labels and controls; their height is content-driven, with the same type
roles, input heights and 4px label/control gap. Recoil table rows share the normal
row height. Long labels and wrapped key collections can grow instead of clipping.

Select and include-menu options use the standard control height. The extension
key menu matches its 24px trigger. Popover gaps, insets and width limits scale
with the root font size, including menus rendered outside the triggering panel.

## Layout rules

- Never distribute spare height into form rows or panel title bars. All six
  desktop workspace input rows, including the label-group entry, have equal height.
- In landscape, the input and output panels have equal outer heights. Core and
  feature cards share one height, bounded by their content and an upper limit.
- In portrait, input and output stack; feature cards use three columns. Both
  card types grow moderately, section spacing increases, and output height is
  bounded. The topbar and form controls retain the shared density scale.
- Keep related cards and panels close, using the same card gap between them.
  Main section title rows share one height; their typography provides hierarchy.
- When the viewport cannot fit the minimum readable layout, allow vertical
  scrolling instead of clipping labels or shrinking controls independently.
- Keep the 60% detail drawer and its controls on the same scale as the workspace.

When changing these rules, check a small landscape window, a maximized landscape
window, 1080×1920 and 1440×2560 portrait, a scaled portrait viewport, and a short
window. Compare actual workspace and Trigger drawer row/control heights, panel
alignment, card text overlap, horizontal overflow, and preview aspect ratio.

## Verified coverage

The shared styles were checked in all five core drawers, all eleven component
drawers, the full input settings, startup settings, ordinary selects, include
menus, and extension-key menus. The following viewport comparisons use actual
rendered primary/detail rows and primary-select/detail-number-input heights:

| Viewport | Primary / detail row | Primary / detail input |
| --- | --- | --- |
| 1265×780 | 38.14 / 38.14 | 24.27 / 24.27 |
| 1920×1080 | 48 / 48 | 32 / 32 |
| 1080×1920 | 48 / 48 | 32 / 32 |
| 1440×2560 | 48 / 48 | 32 / 32 |
| 864×1536 | 40.80 / 40.80 | 27.19 / 27.19 |
| 1265×640 | 34 / 34 | 23.80 / 23.80 |

The short viewport scrolls vertically. At 390px width, wrapped key rows grow
equally in the workspace and drawer. No tested drawer had horizontal overflow;
card descriptions did not overlap their footer controls.
