[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SlideContent

# Type Alias: SlideContent

> **SlideContent** = `object`

Defined in: [types/ppt.ts:424](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L424)

Content structure for a slide - varies by slide type
This is the main content payload that the slide generator uses

## Properties

### bullets?

> `optional` **bullets?**: [`BulletPoint`](BulletPoint.md)[]

Defined in: [types/ppt.ts:427](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L427)

Main bullet points (for content/bullets/agenda slides)

---

### subtitle?

> `optional` **subtitle?**: `string`

Defined in: [types/ppt.ts:429](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L429)

Subtitle (for title/section-header slides)

---

### body?

> `optional` **body?**: `string`

Defined in: [types/ppt.ts:431](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L431)

Body text (for simple text content)

---

### sectionNumber?

> `optional` **sectionNumber?**: `number`

Defined in: [types/ppt.ts:433](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L433)

Section number (for section-header slides)

---

### quote?

> `optional` **quote?**: `string`

Defined in: [types/ppt.ts:437](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L437)

Quote text (for quote slides)

---

### quoteAuthor?

> `optional` **quoteAuthor?**: `string`

Defined in: [types/ppt.ts:439](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L439)

Quote author/attribution

---

### quoteAuthorTitle?

> `optional` **quoteAuthorTitle?**: `string`

Defined in: [types/ppt.ts:441](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L441)

Author title/role

---

### leftColumn?

> `optional` **leftColumn?**: `object`

Defined in: [types/ppt.ts:445](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L445)

Left column content (for two-column/comparison)

#### title?

> `optional` **title?**: `string`

#### bullets?

> `optional` **bullets?**: [`BulletPoint`](BulletPoint.md)[]

#### image?

> `optional` **image?**: `string`

---

### rightColumn?

> `optional` **rightColumn?**: `object`

Defined in: [types/ppt.ts:451](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L451)

Right column content (for two-column/comparison)

#### title?

> `optional` **title?**: `string`

#### bullets?

> `optional` **bullets?**: [`BulletPoint`](BulletPoint.md)[]

#### image?

> `optional` **image?**: `string`

---

### centerColumn?

> `optional` **centerColumn?**: `object`

Defined in: [types/ppt.ts:457](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L457)

Center column (for three-column layouts)

#### title?

> `optional` **title?**: `string`

#### bullets?

> `optional` **bullets?**: [`BulletPoint`](BulletPoint.md)[]

#### image?

> `optional` **image?**: `string`

---

### caption?

> `optional` **caption?**: `string`

Defined in: [types/ppt.ts:465](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L465)

Caption for image-focused slides

---

### galleryImages?

> `optional` **galleryImages?**: `object`[]

Defined in: [types/ppt.ts:467](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L467)

Multiple images for gallery slides

#### prompt

> **prompt**: `string`

#### caption?

> `optional` **caption?**: `string`

---

### tableData?

> `optional` **tableData?**: `object`

Defined in: [types/ppt.ts:474](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L474)

Table data for table slides

#### headers?

> `optional` **headers?**: `string`[]

#### rows

> **rows**: [`TableRow`](TableRow.md)[]

#### hasHeader?

> `optional` **hasHeader?**: `boolean`

Show header row with different styling

#### caption?

> `optional` **caption?**: `string`

Caption below table

---

### chartData?

> `optional` **chartData?**: `object`

Defined in: [types/ppt.ts:485](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L485)

Chart configuration for chart slides

#### type

> **type**: `"bar"` \| `"line"` \| `"pie"` \| `"doughnut"` \| `"area"` \| `"radar"` \| `"scatter"`

Chart type matches SlideType: chart-bar, chart-line, chart-pie, chart-area

#### title?

> `optional` **title?**: `string`

Chart title

#### series?

> `optional` **series?**: [`ChartSeries`](ChartSeries.md)[]

Single series for simple charts

#### legendPosition?

> `optional` **legendPosition?**: `"top"` \| `"bottom"` \| `"left"` \| `"right"` \| `"none"`

Legend position

#### showLabels?

> `optional` **showLabels?**: `boolean`

Show data labels on chart

#### showValueAxis?

> `optional` **showValueAxis?**: `boolean`

Show value axis

#### showCategoryAxis?

> `optional` **showCategoryAxis?**: `boolean`

Show category axis

---

### statistics?

> `optional` **statistics?**: [`Statistic`](Statistic.md)[]

Defined in: [types/ppt.ts:504](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L504)

Statistics/metrics for statistics slides

---

### timeline?

> `optional` **timeline?**: `object`

Defined in: [types/ppt.ts:508](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L508)

Timeline items for timeline slides

#### items

> **items**: [`TimelineItem`](TimelineItem.md)[]

#### orientation?

> `optional` **orientation?**: `"horizontal"` \| `"vertical"`

Horizontal or vertical layout

---

### processSteps?

> `optional` **processSteps?**: [`ProcessStep`](ProcessStep.md)[]

Defined in: [types/ppt.ts:516](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L516)

Process steps for process-flow slides

---

### teamMembers?

> `optional` **teamMembers?**: [`TeamMember`](TeamMember.md)[]

Defined in: [types/ppt.ts:520](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L520)

Team members for team slides

---

### features?

> `optional` **features?**: [`FeatureItem`](FeatureItem.md)[]

Defined in: [types/ppt.ts:524](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L524)

Feature items for features slides

---

### comparison?

> `optional` **comparison?**: `object`

Defined in: [types/ppt.ts:528](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L528)

Comparison data for comparison slides

#### columns

> **columns**: [`ComparisonColumn`](ComparisonColumn.md)[]

#### comparisonTitle?

> `optional` **comparisonTitle?**: `string`

Comparison title (e.g., "Basic vs Pro")

---

### cta?

> `optional` **cta?**: `string`

Defined in: [types/ppt.ts:536](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L536)

Call-to-action text

---

### ctaButton?

> `optional` **ctaButton?**: `string`

Defined in: [types/ppt.ts:538](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L538)

CTA button text

---

### contactInfo?

> `optional` **contactInfo?**: `object`

Defined in: [types/ppt.ts:540](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L540)

Contact information (for thank-you/closing slides)

#### email?

> `optional` **email?**: `string`

#### website?

> `optional` **website?**: `string`

#### phone?

> `optional` **phone?**: `string`

#### social?

> `optional` **social?**: `object`[]

#### address?

> `optional` **address?**: `string`

---

### nextSteps?

> `optional` **nextSteps?**: `string`[]

Defined in: [types/ppt.ts:551](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L551)

Next steps list (for closing slides)

---

### icons?

> `optional` **icons?**: `object`[]

Defined in: [types/ppt.ts:555](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L555)

Icon items for icon-grid slides

#### icon

> **icon**: `string`

#### label

> **label**: `string`

#### description?

> `optional` **description?**: `string`

---

### layoutOptions?

> `optional` **layoutOptions?**: `object`

Defined in: [types/ppt.ts:563](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L563)

Custom layout overrides - AI can specify positions/sizes

#### title?

> `optional` **title?**: `object`

Title positioning

##### title.x?

> `optional` **x?**: `number`

##### title.y?

> `optional` **y?**: `number`

##### title.w?

> `optional` **w?**: `number`

##### title.h?

> `optional` **h?**: `number`

##### title.fontSize?

> `optional` **fontSize?**: `number`

##### title.align?

> `optional` **align?**: `"left"` \| `"center"` \| `"right"`

##### title.color?

> `optional` **color?**: `string`

#### subtitle?

> `optional` **subtitle?**: `object`

Subtitle/description positioning

##### subtitle.x?

> `optional` **x?**: `number`

##### subtitle.y?

> `optional` **y?**: `number`

##### subtitle.w?

> `optional` **w?**: `number`

##### subtitle.h?

> `optional` **h?**: `number`

##### subtitle.fontSize?

> `optional` **fontSize?**: `number`

##### subtitle.align?

> `optional` **align?**: `"left"` \| `"center"` \| `"right"`

##### subtitle.color?

> `optional` **color?**: `string`

#### content?

> `optional` **content?**: `object`

Content area positioning (for bullets, body text)

##### content.x?

> `optional` **x?**: `number`

##### content.y?

> `optional` **y?**: `number`

##### content.w?

> `optional` **w?**: `number`

##### content.h?

> `optional` **h?**: `number`

##### content.fontSize?

> `optional` **fontSize?**: `number`

#### background?

> `optional` **background?**: `object`

Background style

##### background.color?

> `optional` **color?**: `string`

##### background.useThemePrimary?

> `optional` **useThemePrimary?**: `boolean`

##### background.useThemeSecondary?

> `optional` **useThemeSecondary?**: `boolean`

#### sectionNumber?

> `optional` **sectionNumber?**: `object`

Section number styling (for section-header)

##### sectionNumber.x?

> `optional` **x?**: `number`

##### sectionNumber.y?

> `optional` **y?**: `number`

##### sectionNumber.fontSize?

> `optional` **fontSize?**: `number`

##### sectionNumber.style?

> `optional` **style?**: `"large"` \| `"small"` \| `"watermark"`

##### sectionNumber.color?

> `optional` **color?**: `string`

#### quote?

> `optional` **quote?**: `object`

Quote styling

##### quote.x?

> `optional` **x?**: `number`

##### quote.y?

> `optional` **y?**: `number`

##### quote.w?

> `optional` **w?**: `number`

##### quote.fontSize?

> `optional` **fontSize?**: `number`

##### quote.align?

> `optional` **align?**: `"left"` \| `"center"` \| `"right"`

#### statistics?

> `optional` **statistics?**: `object`

Statistics layout

##### statistics.columns?

> `optional` **columns?**: `number`

##### statistics.startY?

> `optional` **startY?**: `number`

##### statistics.valueSize?

> `optional` **valueSize?**: `number`

##### statistics.labelSize?

> `optional` **labelSize?**: `number`

#### chart?

> `optional` **chart?**: `object`

Chart positioning

##### chart.x?

> `optional` **x?**: `number`

##### chart.y?

> `optional` **y?**: `number`

##### chart.w?

> `optional` **w?**: `number`

##### chart.h?

> `optional` **h?**: `number`

##### chart.showLegend?

> `optional` **showLegend?**: `boolean`

##### chart.showLabels?

> `optional` **showLabels?**: `boolean`

#### table?

> `optional` **table?**: `object`

Table styling

##### table.x?

> `optional` **x?**: `number`

##### table.y?

> `optional` **y?**: `number`

##### table.w?

> `optional` **w?**: `number`

##### table.headerBgColor?

> `optional` **headerBgColor?**: `string`

##### table.altRowColor?

> `optional` **altRowColor?**: `string`

#### columns?

> `optional` **columns?**: `object`

Column layouts (two-column, three-column)

##### columns.gap?

> `optional` **gap?**: `number`

##### columns.leftWidth?

> `optional` **leftWidth?**: `number`

##### columns.rightWidth?

> `optional` **rightWidth?**: `number`

#### image?

> `optional` **image?**: `object`

Image positioning

##### image.x?

> `optional` **x?**: `number`

##### image.y?

> `optional` **y?**: `number`

##### image.w?

> `optional` **w?**: `number`

##### image.h?

> `optional` **h?**: `number`

##### image.position?

> `optional` **position?**: `"left"` \| `"right"` \| `"center"` \| `"full"`

#### timeline?

> `optional` **timeline?**: `object`

Timeline/Process flow

##### timeline.orientation?

> `optional` **orientation?**: `"horizontal"` \| `"vertical"`

##### timeline.connectorColor?

> `optional` **connectorColor?**: `string`

##### timeline.nodeSize?

> `optional` **nodeSize?**: `number`

---

### dashboard?

> `optional` **dashboard?**: `object`

Defined in: [types/ppt.ts:662](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L662)

Dashboard configuration for composite slides with multiple content zones

#### layout

> **layout**: `"left-right"` \| `"top-bottom"` \| `"three-cols"` \| `"quadrants"` \| `"five-boxes"` \| `"six-boxes"` \| `"main-sidebar"` \| `"top-three"`

Layout preset: left-right, top-bottom, three-cols, quadrants, five-boxes, six-boxes, main-sidebar, top-three

#### zones

> **zones**: `object`[]

Content zones - each zone can have different content type
