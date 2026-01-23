/**
 * Slide Renderers
 *
 * Standalone render functions for each slide type.
 * Extracted from SlideGenerator to keep functions under 300 lines.
 *
 * @module presentation/slideRenderers
 */

import type {
  SlideContent,
  SlideLayout,
  SlideType,
  PresentationTheme,
  BulletPoint,
  Statistic,
  TimelineItem,
  ProcessStep,
  ChartSeries,
  TableRow,
  FeatureItem,
  ComparisonColumn,
  PptxSlide,
  PptxTextProps,
  PptxTableRow,
  PptxChartName,
} from "./types.js";

// ============================================================================
// LAYOUT POSITIONS
// ============================================================================

export const LAYOUT_POSITIONS = {
  margin: { x: 0.5, y: 0.4 },
  title: { x: 0.5, y: 0.4, w: 9, h: 0.8 },
  subtitle: { x: 0.5, y: 1.4, w: 9, h: 0.5 },
  content: { x: 0.5, y: 1.4, w: 9, h: 3.8 },
  contentFull: { x: 0.5, y: 1.4, w: 9, h: 3.8 },
  contentLeft: { x: 0.5, y: 1.4, w: 4.2, h: 3.8 },
  contentRight: { x: 5.3, y: 1.4, w: 4.2, h: 3.8 },
  imageRight: { x: 5.3, y: 1.4, w: 4.2, h: 3.8 },
  imageLeft: { x: 0.5, y: 1.4, w: 4.2, h: 3.8 },
  imageFull: { x: 0, y: 0, w: 10, h: 5.625 },
  imageCentered: { x: 2, y: 1.2, w: 6, h: 3.6 },
  columnLeft: { x: 0.5, y: 1.4, w: 4.2, h: 3.8 },
  columnRight: { x: 5.3, y: 1.4, w: 4.2, h: 3.8 },
  col1: { x: 0.5, y: 1.4, w: 2.8, h: 3.8 },
  col2: { x: 3.5, y: 1.4, w: 2.8, h: 3.8 },
  col3: { x: 6.5, y: 1.4, w: 2.8, h: 3.8 },
  chart: { x: 0.5, y: 1.4, w: 9, h: 3.8 },
  statRow: { y: 2.2, h: 2.5 },
  footer: { x: 0.5, y: 5.2, w: 9, h: 0.3 },
  logo: {
    "top-left": { x: 0.3, y: 0.2 },
    "top-right": { x: 8.5, y: 0.2 },
    "bottom-left": { x: 0.3, y: 5.0 },
    "bottom-right": { x: 8.5, y: 5.0 },
  },
  quote: { x: 1, y: 1.5, w: 8, h: 2.5 },
  quoteAuthor: { x: 1, y: 4.2, w: 8, h: 0.5 },
};

/**
 * Map legend position from SlideContent values to pptxgenjs values
 */
const LEGEND_POS_MAP: Record<string, "t" | "b" | "l" | "r"> = {
  top: "t",
  bottom: "b",
  left: "l",
  right: "r",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function addTitle(
  slide: PptxSlide,
  title: string,
  theme: PresentationTheme,
): void {
  slide.addText(title, {
    x: LAYOUT_POSITIONS.title.x,
    y: LAYOUT_POSITIONS.title.y,
    w: LAYOUT_POSITIONS.title.w,
    h: LAYOUT_POSITIONS.title.h,
    fontSize: theme.fonts.sizes.heading,
    fontFace: theme.fonts.heading,
    color: theme.colors.text.replace("#", ""),
    bold: true,
  });

  slide.addShape("rect", {
    x: LAYOUT_POSITIONS.title.x,
    y: LAYOUT_POSITIONS.title.y + LAYOUT_POSITIONS.title.h + 0.1,
    w: 1.5,
    h: 0.05,
    fill: { color: theme.colors.primary.replace("#", "") },
  });
}

export function addBullets(
  slide: PptxSlide,
  bullets: BulletPoint[],
  pos: { x: number; y: number; w: number; h: number },
  theme: PresentationTheme,
): void {
  const textLines: PptxTextProps[] = [];

  bullets.forEach((bullet) => {
    const bulletOptions = bullet.icon
      ? { type: "bullet" as const, code: bullet.icon }
      : { type: "bullet" as const };
    textLines.push({
      text: bullet.text,
      options: {
        bullet: bulletOptions,
        fontSize: theme.fonts.sizes.body,
        fontFace: theme.fonts.body,
        color: theme.colors.text.replace("#", ""),
        bold: bullet.emphasis,
        indentLevel: 0,
      },
    });

    if (bullet.subBullets) {
      bullet.subBullets.forEach((subBullet) => {
        textLines.push({
          text: subBullet,
          options: {
            bullet: { type: "bullet" },
            fontSize: theme.fonts.sizes.body - 2,
            fontFace: theme.fonts.body,
            color: theme.colors.muted.replace("#", ""),
            indentLevel: 1,
          },
        });
      });
    }
  });

  slide.addText(textLines, {
    x: pos.x,
    y: pos.y,
    w: pos.w,
    h: pos.h,
    valign: "top",
  });
}

export function addImage(
  slide: PptxSlide,
  imageBuffer: Buffer,
  pos: { x: number; y: number; w: number; h: number },
): void {
  slide.addImage({
    data: `data:image/png;base64,${imageBuffer.toString("base64")}`,
    x: pos.x,
    y: pos.y,
    w: pos.w,
    h: pos.h,
    sizing: { type: "cover", w: pos.w, h: pos.h },
  });
}

export function getPptxChartType(slideType: SlideType): PptxChartName {
  switch (slideType) {
    case "chart-bar":
      return "bar";
    case "chart-line":
      return "line";
    case "chart-pie":
      return "pie";
    case "chart-area":
      return "area";
    default:
      return "bar";
  }
}

// ============================================================================
// SLIDE RENDERERS - OPENING/CLOSING
// ============================================================================

export function renderTitleSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
  imageBuffer?: Buffer,
): void {
  if (imageBuffer) {
    slide.background = {
      data: `data:image/png;base64,${imageBuffer.toString("base64")}`,
    };
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: "100%",
      h: "100%",
      fill: { color: "000000", transparency: 40 },
    });
  }

  const titleColor = imageBuffer
    ? "FFFFFF"
    : theme.colors.text.replace("#", "");
  slide.addText(title, {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1.2,
    fontSize: theme.fonts.sizes.title,
    fontFace: theme.fonts.heading,
    color: titleColor,
    align: "center",
    bold: true,
  });

  if (content.subtitle) {
    slide.addText(content.subtitle, {
      x: 0.5,
      y: 3.3,
      w: 9,
      h: 0.6,
      fontSize: theme.fonts.sizes.subtitle,
      fontFace: theme.fonts.body,
      color: imageBuffer ? "FFFFFF" : theme.colors.muted.replace("#", ""),
      align: "center",
    });
  }
}

export function renderSectionHeaderSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  if (content.sectionNumber) {
    slide.addText(String(content.sectionNumber).padStart(2, "0"), {
      x: 0.5,
      y: 1.5,
      w: 2,
      h: 1,
      fontSize: 72,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary.replace("#", ""),
      bold: true,
    });
  }

  slide.addText(title, {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1,
    fontSize: theme.fonts.sizes.title,
    fontFace: theme.fonts.heading,
    color: theme.colors.text.replace("#", ""),
    bold: true,
  });

  slide.addShape("rect", {
    x: 0.5,
    y: 3.6,
    w: 2,
    h: 0.08,
    fill: { color: theme.colors.primary.replace("#", "") },
  });
}

export function renderThankYouSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
  imageBuffer?: Buffer,
): void {
  if (imageBuffer) {
    slide.background = {
      data: `data:image/png;base64,${imageBuffer.toString("base64")}`,
    };
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: "100%",
      h: "100%",
      fill: { color: "000000", transparency: 40 },
    });
  }

  const textColor = imageBuffer ? "FFFFFF" : theme.colors.text.replace("#", "");

  slide.addText(title || "Thank You!", {
    x: 0.5,
    y: 1.8,
    w: 9,
    h: 1,
    fontSize: theme.fonts.sizes.title,
    fontFace: theme.fonts.heading,
    color: textColor,
    align: "center",
    bold: true,
  });

  if (content.cta) {
    slide.addText(content.cta, {
      x: 0.5,
      y: 2.9,
      w: 9,
      h: 0.5,
      fontSize: theme.fonts.sizes.subtitle,
      fontFace: theme.fonts.body,
      color: imageBuffer ? "FFFFFF" : theme.colors.muted.replace("#", ""),
      align: "center",
    });
  }

  if (content.contactInfo) {
    const contactLines: string[] = [];
    if (content.contactInfo.email) {
      contactLines.push(`📧 ${content.contactInfo.email}`);
    }
    if (content.contactInfo.website) {
      contactLines.push(`🌐 ${content.contactInfo.website}`);
    }
    if (content.contactInfo.phone) {
      contactLines.push(`📞 ${content.contactInfo.phone}`);
    }

    if (contactLines.length > 0) {
      slide.addText(contactLines.join("   •   "), {
        x: 0.5,
        y: 4.2,
        w: 9,
        h: 0.4,
        fontSize: theme.fonts.sizes.body,
        fontFace: theme.fonts.body,
        color: textColor,
        align: "center",
      });
    }

    if (content.contactInfo.social && content.contactInfo.social.length > 0) {
      const socialText = content.contactInfo.social
        .map((s) => `${s.platform}: ${s.handle}`)
        .join("   •   ");
      slide.addText(socialText, {
        x: 0.5,
        y: 4.7,
        w: 9,
        h: 0.3,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: imageBuffer ? "CCCCCC" : theme.colors.muted.replace("#", ""),
        align: "center",
      });
    }
  }
}

// ============================================================================
// SLIDE RENDERERS - CONTENT
// ============================================================================

export function renderContentSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  layout: SlideLayout,
  theme: PresentationTheme,
  imageBuffer?: Buffer,
): void {
  addTitle(slide, title, theme);

  const hasImage = imageBuffer && layout.includes("image");
  const contentPos = hasImage
    ? layout.includes("left")
      ? LAYOUT_POSITIONS.contentRight
      : LAYOUT_POSITIONS.contentLeft
    : LAYOUT_POSITIONS.contentFull;

  if (content.bullets && content.bullets.length > 0) {
    addBullets(slide, content.bullets, contentPos, theme);
  } else if (content.body) {
    slide.addText(content.body, {
      x: contentPos.x,
      y: contentPos.y,
      w: contentPos.w,
      h: contentPos.h,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.body,
      color: theme.colors.text.replace("#", ""),
      valign: "top",
    });
  }

  if (imageBuffer && hasImage) {
    const imagePos = layout.includes("left")
      ? LAYOUT_POSITIONS.imageLeft
      : LAYOUT_POSITIONS.imageRight;
    addImage(slide, imageBuffer, imagePos);
  }
}

export function renderImageSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  layout: SlideLayout,
  theme: PresentationTheme,
  imageBuffer?: Buffer,
): void {
  if (layout === "image-full-overlay" && imageBuffer) {
    slide.background = {
      data: `data:image/png;base64,${imageBuffer.toString("base64")}`,
    };
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: "100%",
      h: "100%",
      fill: { color: "000000", transparency: 50 },
    });
    slide.addText(title, {
      x: 0.5,
      y: 4.2,
      w: 9,
      h: 1,
      fontSize: theme.fonts.sizes.heading,
      fontFace: theme.fonts.heading,
      color: "FFFFFF",
      bold: true,
    });
  } else if (layout === "image-centered" || layout === "image-full-overlay") {
    addTitle(slide, title, theme);
    if (imageBuffer) {
      addImage(slide, imageBuffer, LAYOUT_POSITIONS.imageCentered);
    }
    if (content.caption) {
      slide.addText(content.caption, {
        x: 0.5,
        y: 5,
        w: 9,
        h: 0.4,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: theme.colors.muted.replace("#", ""),
        align: "center",
      });
    }
  } else {
    renderContentSlide(slide, title, content, layout, theme, imageBuffer);
  }
}

// ============================================================================
// SLIDE RENDERERS - COLUMNS
// ============================================================================

export function renderTwoColumnSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  layout: SlideLayout,
  theme: PresentationTheme,
  imageBuffer?: Buffer,
): void {
  addTitle(slide, title, theme);

  if (content.leftColumn) {
    if (content.leftColumn.title) {
      slide.addText(content.leftColumn.title, {
        x: LAYOUT_POSITIONS.columnLeft.x,
        y: 1.3,
        w: LAYOUT_POSITIONS.columnLeft.w,
        h: 0.4,
        fontSize: theme.fonts.sizes.heading - 4,
        fontFace: theme.fonts.heading,
        color: theme.colors.primary.replace("#", ""),
        bold: true,
      });
    }
    if (content.leftColumn.bullets) {
      addBullets(
        slide,
        content.leftColumn.bullets,
        { ...LAYOUT_POSITIONS.columnLeft, y: 1.8, h: 3.4 },
        theme,
      );
    }
  }

  if (content.rightColumn) {
    if (content.rightColumn.title) {
      slide.addText(content.rightColumn.title, {
        x: LAYOUT_POSITIONS.columnRight.x,
        y: 1.3,
        w: LAYOUT_POSITIONS.columnRight.w,
        h: 0.4,
        fontSize: theme.fonts.sizes.heading - 4,
        fontFace: theme.fonts.heading,
        color: theme.colors.primary.replace("#", ""),
        bold: true,
      });
    }
    if (content.rightColumn.bullets) {
      addBullets(
        slide,
        content.rightColumn.bullets,
        { ...LAYOUT_POSITIONS.columnRight, y: 1.8, h: 3.4 },
        theme,
      );
    }
  }

  if (imageBuffer && !content.rightColumn?.bullets) {
    addImage(slide, imageBuffer, LAYOUT_POSITIONS.columnRight);
  }
}

export function renderThreeColumnSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  const columns = [
    { data: content.leftColumn, pos: LAYOUT_POSITIONS.col1 },
    { data: content.centerColumn, pos: LAYOUT_POSITIONS.col2 },
    { data: content.rightColumn, pos: LAYOUT_POSITIONS.col3 },
  ];

  columns.forEach(({ data, pos }) => {
    if (data) {
      if (data.title) {
        slide.addText(data.title, {
          x: pos.x,
          y: 1.3,
          w: pos.w,
          h: 0.4,
          fontSize: theme.fonts.sizes.heading - 6,
          fontFace: theme.fonts.heading,
          color: theme.colors.primary.replace("#", ""),
          bold: true,
          align: "center",
        });
      }
      if (data.bullets) {
        addBullets(slide, data.bullets, { ...pos, y: 1.8, h: 3.4 }, theme);
      }
    }
  });
}

// ============================================================================
// SLIDE RENDERERS - DATA VISUALIZATION
// ============================================================================

export function renderQuoteSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  slide.addText("\u201C", {
    x: 0.5,
    y: 1,
    w: 1,
    h: 1,
    fontSize: 120,
    fontFace: "Georgia",
    color: theme.colors.primary.replace("#", ""),
  });

  if (content.quote) {
    slide.addText(content.quote, {
      x: LAYOUT_POSITIONS.quote.x,
      y: LAYOUT_POSITIONS.quote.y,
      w: LAYOUT_POSITIONS.quote.w,
      h: LAYOUT_POSITIONS.quote.h,
      fontSize: theme.fonts.sizes.heading,
      fontFace: "Georgia",
      color: theme.colors.text.replace("#", ""),
      italic: true,
      valign: "middle",
    });
  }

  if (content.quoteAuthor) {
    let authorText = `— ${content.quoteAuthor}`;
    if (content.quoteAuthorTitle) {
      authorText += `, ${content.quoteAuthorTitle}`;
    }
    slide.addText(authorText, {
      x: LAYOUT_POSITIONS.quoteAuthor.x,
      y: LAYOUT_POSITIONS.quoteAuthor.y,
      w: LAYOUT_POSITIONS.quoteAuthor.w,
      h: LAYOUT_POSITIONS.quoteAuthor.h,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.body,
      color: theme.colors.muted.replace("#", ""),
      align: "right",
    });
  }
}

export function renderStatisticsSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.statistics || content.statistics.length === 0) {
    return;
  }

  const stats = content.statistics.slice(0, 4);
  const statWidth = 9 / stats.length;

  stats.forEach((stat: Statistic, index: number) => {
    const x = 0.5 + index * statWidth;

    slide.addText(stat.value, {
      x,
      y: LAYOUT_POSITIONS.statRow.y,
      w: statWidth - 0.2,
      h: 1.2,
      fontSize: 48,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary.replace("#", ""),
      bold: true,
      align: "center",
    });

    slide.addText(stat.label, {
      x,
      y: LAYOUT_POSITIONS.statRow.y + 1.3,
      w: statWidth - 0.2,
      h: 0.5,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.body,
      color: theme.colors.text.replace("#", ""),
      align: "center",
    });

    if (stat.change || stat.trend) {
      const trendColor =
        stat.trend === "up"
          ? "22C55E"
          : stat.trend === "down"
            ? "EF4444"
            : theme.colors.muted.replace("#", "");
      const trendSymbol =
        stat.trend === "up" ? "↑" : stat.trend === "down" ? "↓" : "";
      slide.addText(`${trendSymbol} ${stat.change || ""}`, {
        x,
        y: LAYOUT_POSITIONS.statRow.y + 1.8,
        w: statWidth - 0.2,
        h: 0.4,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: trendColor,
        align: "center",
      });
    }
  });
}

export function renderChartSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  chartType: SlideType,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.chartData || !content.chartData.series) {
    return;
  }

  const pptxChartType = getPptxChartType(chartType);
  const chartData = content.chartData.series.map((series: ChartSeries) => ({
    name: series.name,
    labels: series.labels,
    values: series.values,
  }));

  slide.addChart(pptxChartType, chartData, {
    x: LAYOUT_POSITIONS.chart.x,
    y: LAYOUT_POSITIONS.chart.y,
    w: LAYOUT_POSITIONS.chart.w,
    h: LAYOUT_POSITIONS.chart.h,
    showTitle: !!content.chartData.title,
    title: content.chartData.title,
    showLegend: content.chartData.legendPosition !== "none",
    legendPos:
      LEGEND_POS_MAP[content.chartData.legendPosition || "bottom"] || "b",
    showValue: content.chartData.showLabels,
    chartColors: [
      theme.colors.primary.replace("#", ""),
      theme.colors.secondary.replace("#", ""),
      theme.colors.accent.replace("#", ""),
    ],
  });
}

export function renderTableSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.tableData) {
    return;
  }

  const { headers, rows, hasHeader } = content.tableData;
  const tableRows: PptxTableRow[] = [];

  if (hasHeader && headers) {
    tableRows.push(
      headers.map((header) => ({
        text: header,
        options: {
          bold: true,
          fill: { color: theme.colors.primary.replace("#", "") },
          color: theme.colors.textOnPrimary.replace("#", ""),
          align: "center" as const,
        },
      })),
    );
  }

  rows.forEach((row: TableRow, rowIndex: number) => {
    tableRows.push(
      row.map((cell) => ({
        text: cell.text,
        options: {
          fill: { color: rowIndex % 2 === 0 ? "F8FAFC" : "FFFFFF" },
          color: theme.colors.text.replace("#", ""),
          align: (cell.align || "left") as "left" | "center" | "right",
        },
      })),
    );
  });

  slide.addTable(tableRows, {
    x: LAYOUT_POSITIONS.chart.x,
    y: LAYOUT_POSITIONS.chart.y,
    w: LAYOUT_POSITIONS.chart.w,
    colW: Array(headers?.length || rows[0]?.length || 1).fill(
      LAYOUT_POSITIONS.chart.w / (headers?.length || rows[0]?.length || 1),
    ),
    fontSize: theme.fonts.sizes.body - 2,
    fontFace: theme.fonts.body,
    border: { pt: 0.5, color: "E2E8F0" },
    autoPage: true,
  });

  if (content.tableData.caption) {
    slide.addText(content.tableData.caption, {
      x: 0.5,
      y: 5.1,
      w: 9,
      h: 0.3,
      fontSize: theme.fonts.sizes.caption,
      fontFace: theme.fonts.body,
      color: theme.colors.muted.replace("#", ""),
      align: "center",
    });
  }
}

// ============================================================================
// SLIDE RENDERERS - PROCESS & TIMELINE
// ============================================================================

export function renderTimelineSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.timeline?.items) {
    return;
  }

  const items = content.timeline.items.slice(0, 5);
  const isHorizontal = content.timeline.orientation !== "vertical";

  if (isHorizontal) {
    renderHorizontalTimeline(slide, items, theme);
  } else {
    renderVerticalTimeline(slide, items, theme);
  }
}

function renderHorizontalTimeline(
  slide: PptxSlide,
  items: TimelineItem[],
  theme: PresentationTheme,
): void {
  const itemWidth = 8 / items.length;
  const lineY = 2.8;

  slide.addShape("rect", {
    x: 1,
    y: lineY,
    w: 8,
    h: 0.04,
    fill: { color: theme.colors.primary.replace("#", "") },
  });

  items.forEach((item: TimelineItem, index: number) => {
    const x = 1 + index * itemWidth + itemWidth / 2 - 0.15;

    slide.addShape("ellipse", {
      x,
      y: lineY - 0.15,
      w: 0.3,
      h: 0.3,
      fill: { color: theme.colors.primary.replace("#", "") },
    });

    slide.addText(item.date, {
      x: x - itemWidth / 2 + 0.15,
      y: lineY - 0.8,
      w: itemWidth,
      h: 0.4,
      fontSize: theme.fonts.sizes.caption,
      fontFace: theme.fonts.body,
      color: theme.colors.primary.replace("#", ""),
      align: "center",
      bold: true,
    });

    slide.addText(item.title, {
      x: x - itemWidth / 2 + 0.15,
      y: lineY + 0.4,
      w: itemWidth,
      h: 0.4,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.heading,
      color: theme.colors.text.replace("#", ""),
      align: "center",
      bold: true,
    });

    if (item.description) {
      slide.addText(item.description, {
        x: x - itemWidth / 2 + 0.15,
        y: lineY + 0.85,
        w: itemWidth,
        h: 0.8,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: theme.colors.muted.replace("#", ""),
        align: "center",
      });
    }
  });
}

function renderVerticalTimeline(
  slide: PptxSlide,
  items: TimelineItem[],
  theme: PresentationTheme,
): void {
  const itemHeight = 3 / items.length;
  const lineX = 1.5;

  slide.addShape("rect", {
    x: lineX,
    y: 1.5,
    w: 0.04,
    h: 3.5,
    fill: { color: theme.colors.primary.replace("#", "") },
  });

  items.forEach((item: TimelineItem, index: number) => {
    const y = 1.7 + index * itemHeight;

    slide.addShape("ellipse", {
      x: lineX - 0.12,
      y,
      w: 0.28,
      h: 0.28,
      fill: { color: theme.colors.primary.replace("#", "") },
    });

    slide.addText(item.date, {
      x: 0.3,
      y: y - 0.1,
      w: 1,
      h: 0.3,
      fontSize: theme.fonts.sizes.caption,
      fontFace: theme.fonts.body,
      color: theme.colors.primary.replace("#", ""),
      bold: true,
    });

    slide.addText(item.title, {
      x: 2,
      y: y - 0.1,
      w: 7,
      h: 0.4,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.heading,
      color: theme.colors.text.replace("#", ""),
      bold: true,
    });

    if (item.description) {
      slide.addText(item.description, {
        x: 2,
        y: y + 0.3,
        w: 7,
        h: 0.4,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: theme.colors.muted.replace("#", ""),
      });
    }
  });
}

export function renderProcessFlowSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.processSteps) {
    return;
  }

  const steps = content.processSteps.slice(0, 5);
  const stepWidth = 8 / steps.length;

  steps.forEach((step: ProcessStep, index: number) => {
    const x = 1 + index * stepWidth;
    const boxWidth = stepWidth - 0.4;

    slide.addShape("roundRect", {
      x,
      y: 2,
      w: boxWidth,
      h: 2,
      fill: { color: theme.colors.primary.replace("#", "") },
      rectRadius: 0.1,
    });

    slide.addText(String(step.step), {
      x,
      y: 2.1,
      w: boxWidth,
      h: 0.5,
      fontSize: 24,
      fontFace: theme.fonts.heading,
      color: theme.colors.textOnPrimary.replace("#", ""),
      align: "center",
      bold: true,
    });

    slide.addText(step.title, {
      x,
      y: 2.6,
      w: boxWidth,
      h: 0.5,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.heading,
      color: theme.colors.textOnPrimary.replace("#", ""),
      align: "center",
      bold: true,
    });

    if (step.description) {
      slide.addText(step.description, {
        x,
        y: 3.2,
        w: boxWidth,
        h: 0.7,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: theme.colors.textOnPrimary.replace("#", ""),
        align: "center",
      });
    }

    if (index < steps.length - 1) {
      slide.addText("→", {
        x: x + boxWidth,
        y: 2.8,
        w: 0.4,
        h: 0.5,
        fontSize: 24,
        fontFace: theme.fonts.body,
        color: theme.colors.primary.replace("#", ""),
        align: "center",
      });
    }
  });
}

// ============================================================================
// SLIDE RENDERERS - COMPARISON & FEATURES
// ============================================================================

export function renderComparisonSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.comparison?.columns) {
    return;
  }

  const columns = content.comparison.columns.slice(0, 2);
  const columnWidth = 4.2;

  columns.forEach((col: ComparisonColumn, index: number) => {
    const x = 0.5 + index * 4.8;

    slide.addShape("roundRect", {
      x,
      y: 1.4,
      w: columnWidth,
      h: 0.5,
      fill: {
        color: col.highlight
          ? theme.colors.primary.replace("#", "")
          : theme.colors.muted.replace("#", ""),
      },
      rectRadius: 0.05,
    });

    slide.addText(col.title, {
      x,
      y: 1.4,
      w: columnWidth,
      h: 0.5,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.heading,
      color: col.highlight
        ? theme.colors.textOnPrimary.replace("#", "")
        : theme.colors.text.replace("#", ""),
      align: "center",
      bold: true,
      valign: "middle",
    });

    col.items.forEach((item, itemIndex) => {
      slide.addText(`• ${item}`, {
        x: x + 0.2,
        y: 2.1 + itemIndex * 0.5,
        w: columnWidth - 0.4,
        h: 0.4,
        fontSize: theme.fonts.sizes.body,
        fontFace: theme.fonts.body,
        color: theme.colors.text.replace("#", ""),
      });
    });
  });
}

export function renderFeaturesSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  const rawFeatures = content.features || [];
  const rawIcons = content.icons || [];

  const normalizedFeatures: FeatureItem[] =
    rawFeatures.length > 0
      ? rawFeatures
      : rawIcons.map((icon) => ({
          title: icon.label,
          description: icon.description || "",
          icon: icon.icon,
        }));

  if (normalizedFeatures.length === 0) {
    return;
  }

  const itemsPerRow = Math.min(normalizedFeatures.length, 3);
  const itemWidth = 9 / itemsPerRow;

  normalizedFeatures
    .slice(0, 6)
    .forEach((feature: FeatureItem, index: number) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const x = 0.5 + col * itemWidth;
      const y = 1.6 + row * 1.8;

      if (feature.icon) {
        const codePoint = parseInt(feature.icon, 16);
        if (
          !Number.isNaN(codePoint) &&
          codePoint >= 0 &&
          codePoint <= 0x10ffff
        ) {
          const iconChar = String.fromCodePoint(codePoint);
          slide.addText(iconChar, {
            x,
            y,
            w: itemWidth - 0.2,
            h: 0.6,
            fontSize: 36,
            fontFace: "Segoe UI Emoji",
            color: theme.colors.primary.replace("#", ""),
            align: "center",
          });
        }
      }

      slide.addText(feature.title, {
        x,
        y: y + 0.6,
        w: itemWidth - 0.2,
        h: 0.4,
        fontSize: theme.fonts.sizes.body,
        fontFace: theme.fonts.heading,
        color: theme.colors.text.replace("#", ""),
        align: "center",
        bold: true,
      });

      if (feature.description) {
        slide.addText(feature.description, {
          x,
          y: y + 1,
          w: itemWidth - 0.2,
          h: 0.6,
          fontSize: theme.fonts.sizes.caption,
          fontFace: theme.fonts.body,
          color: theme.colors.muted.replace("#", ""),
          align: "center",
        });
      }
    });
}

export function renderTeamSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.teamMembers) {
    return;
  }

  const members = content.teamMembers.slice(0, 4);
  const memberWidth = 9 / members.length;

  members.forEach((member, index) => {
    const x = 0.5 + index * memberWidth;

    slide.addShape("ellipse", {
      x: x + (memberWidth - 1.5) / 2,
      y: 1.6,
      w: 1.5,
      h: 1.5,
      fill: { color: theme.colors.muted.replace("#", "") },
    });

    const initials = member.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2);
    slide.addText(initials, {
      x: x + (memberWidth - 1.5) / 2,
      y: 2,
      w: 1.5,
      h: 0.7,
      fontSize: 28,
      fontFace: theme.fonts.heading,
      color: "FFFFFF",
      align: "center",
      bold: true,
    });

    slide.addText(member.name, {
      x,
      y: 3.3,
      w: memberWidth - 0.2,
      h: 0.4,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.heading,
      color: theme.colors.text.replace("#", ""),
      align: "center",
      bold: true,
    });

    slide.addText(member.role, {
      x,
      y: 3.7,
      w: memberWidth - 0.2,
      h: 0.3,
      fontSize: theme.fonts.sizes.caption,
      fontFace: theme.fonts.body,
      color: theme.colors.muted.replace("#", ""),
      align: "center",
    });
  });
}

export function renderConclusionSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (content.bullets) {
    const checkmarkBullets = content.bullets.map((bullet) => ({
      ...bullet,
      icon: bullet.icon || "2713",
    }));
    addBullets(slide, checkmarkBullets, LAYOUT_POSITIONS.contentFull, theme);
  }

  if (content.cta) {
    slide.addText(content.cta, {
      x: 0.5,
      y: 4.6,
      w: 9,
      h: 0.5,
      fontSize: theme.fonts.sizes.heading - 4,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary.replace("#", ""),
      align: "center",
      bold: true,
    });
  }
}
