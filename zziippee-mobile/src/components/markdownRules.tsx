import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, radius } from '../theme/tokens';

const FADE_WIDTH = 28;

/**
 * Wraps horizontally-scrollable content with edge-fade gradients that hint more
 * content is off-screen — shown only while there's actually somewhere left to
 * scroll (hidden at rest if content fits; right fade drops once scrolled to the
 * end; left fade appears once scrolled away from the start). Always spans the
 * full width offered to it (correct for code/log blocks, which are block-level
 * content and should fill the reading column like <pre> does on the web).
 *
 * Defined at module scope (not inside scrollableMarkdownRules) so its identity
 * is stable across renders — the rule functions that use it are recreated on
 * every render of the host screen, but as long as they keep returning elements
 * of this same component type, React preserves its scroll-position state
 * instead of remounting it on every keystroke/tap.
 */
function HScrollFade({
  background,
  contentContainerStyle,
  children,
}: {
  background: string;
  contentContainerStyle?: object;
  children: React.ReactNode;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const overflowing = contentWidth > containerWidth + 1;
  const showLeft = overflowing && scrollX > 2;
  const showRight = overflowing && scrollX < contentWidth - containerWidth - 2;

  return (
    <View style={styles.frame}>
      <ScrollView
        horizontal
        contentContainerStyle={contentContainerStyle}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentWidth(w)}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => setScrollX(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
      {showLeft && (
        <LinearGradient
          pointerEvents="none"
          colors={[background, `${background}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fadeLeft}
        />
      )}
      {showRight && (
        <LinearGradient
          pointerEvents="none"
          colors={[`${background}00`, background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fadeRight}
        />
      )}
    </View>
  );
}

/**
 * Same edge-fade affordance as HScrollFade, but for content that should hug its
 * own natural width (like a table) instead of always filling the reading column
 * — capped so it never exceeds the space available. Resolves the width itself,
 * in two layout passes (measure available space + measure content, then lock in
 * `min(content, available)`), rather than leaning on `alignSelf: 'flex-start'`
 * next to a ScrollView + absolutely-positioned children, which produced a real
 * layout corruption bug (content below the table stopped rendering).
 */
function HugWidthScrollFade({
  background,
  border,
  children,
}: {
  background: string;
  border: string;
  children: React.ReactNode;
}) {
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const cardWidth = availableWidth != null && contentWidth > 0 ? Math.min(contentWidth, availableWidth) : undefined;
  const overflowing = cardWidth != null && contentWidth > cardWidth + 1;
  const showLeft = overflowing && scrollX > 2;
  const showRight = overflowing && scrollX < contentWidth - (cardWidth ?? 0) - 2;

  return (
    <View onLayout={(e) => setAvailableWidth(e.nativeEvent.layout.width)}>
      <View
        style={[
          styles.frame,
          { width: cardWidth, backgroundColor: background, borderColor: border, borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
        ]}
      >
        <ScrollView
          horizontal
          onContentSizeChange={(w) => setContentWidth(w)}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => setScrollX(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
        >
          {children}
        </ScrollView>
        {showLeft && (
          <LinearGradient
            pointerEvents="none"
            colors={[background, `${background}00`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fadeLeft}
          />
        )}
        {showRight && (
          <LinearGradient
            pointerEvents="none"
            colors={[`${background}00`, background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fadeRight}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'relative' },
  fadeLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: FADE_WIDTH },
  fadeRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: FADE_WIDTH },
});

/**
 * Concatenates all descendant text content of a table-cell AST node (handles plain
 * text, inline code, bold, etc). Structural wrapper nodes (e.g. the `inline` node
 * markdown-it puts inside every th/td) carry the *raw unparsed* markdown source in
 * their own `.content` — recursing into `.children` first is required, or a cell
 * like `**malware**` would render literal asterisks instead of bold-stripped text.
 */
function extractCellText(node: any): string {
  if (!node) return '';
  if (node.children?.length) return node.children.map(extractCellText).join('');
  return node.content || '';
}

interface TableCell {
  text: string;
  isHeader: boolean;
}

/** Walks the table AST (thead/tbody > tr > th/td) into a plain row-major grid of cell text. */
function extractTableRows(node: any): TableCell[][] {
  const rows: TableCell[][] = [];
  for (const section of node.children ?? []) {
    if (section.type !== 'thead' && section.type !== 'tbody') continue;
    const sectionIsHeader = section.type === 'thead';
    for (const tr of section.children ?? []) {
      if (tr.type !== 'tr') continue;
      rows.push((tr.children ?? []).map((cell: any) => ({ text: extractCellText(cell), isHeader: sectionIsHeader || cell.type === 'th' })));
    }
  }
  return rows;
}

/**
 * Renderer overrides for fenced code blocks and tables inside question markdown.
 * react-native-markdown-display's default `fence`/`table` renderers put content in
 * a plain wrapping Text/View, which forces long log lines and wide table rows to
 * wrap — breaking monospace column alignment. This wraps them in a horizontal
 * ScrollView instead (mirrors the web app's `overflow-x: auto` treatment), so a
 * long Nmap line or a wide CVSS table scrolls sideways rather than reflowing.
 *
 * Tables are rendered column-major (one View per column, stacking that column's
 * cells) rather than row-major. Stacked independent row Views (the library's
 * default th/tr/td) have no shared notion of "column width", so each row sizes
 * its own cells to its own text — misaligning borders between rows. A column-major
 * layout makes each column naturally hug its widest cell, keeping every row's
 * borders lined up without needing to measure text width across rows by hand.
 */
export function scrollableMarkdownRules(isDark: boolean) {
  const border = isDark ? '#374151' : '#e2e8f0';
  const codeBg = isDark ? '#111827' : '#f8fafc';
  const codeFg = isDark ? '#e5e7eb' : '#1e293b';
  const surfaceBg = isDark ? '#1c1c1e' : '#ffffff';
  const headBg = isDark ? '#1f2937' : '#f1f5f9';
  const headFg = isDark ? '#f3f4f6' : '#111827';
  const cellFg = isDark ? '#d1d5db' : '#374151';

  const renderCode = (node: any) => {
    let { content } = node;
    if (typeof content === 'string' && content.charAt(content.length - 1) === '\n') {
      content = content.substring(0, content.length - 1);
    }
    return (
      <View key={node.key} style={{ backgroundColor: codeBg, borderColor: border, borderWidth: 1, borderRadius: radius.card, marginVertical: spacing.sm, overflow: 'hidden' }}>
        <HScrollFade background={codeBg} contentContainerStyle={{ padding: spacing.md }}>
          <Text style={{ color: codeFg, fontFamily: 'Courier', fontSize: 16, lineHeight: 22 }}>{content}</Text>
        </HScrollFade>
      </View>
    );
  };

  return {
    fence: (node: any) => renderCode(node),
    code_block: (node: any) => renderCode(node),
    table: (node: any) => {
      const rows = extractTableRows(node);
      const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
      return (
        <View key={node.key} style={{ marginVertical: spacing.sm }}>
          <HugWidthScrollFade background={surfaceBg} border={border}>
            {Array.from({ length: columnCount }).map((_, colIdx) => (
              <View key={colIdx} style={{ flexShrink: 0, borderRightWidth: colIdx < columnCount - 1 ? 1 : 0, borderColor: border }}>
                {rows.map((row, rowIdx) => {
                  const cell = row[colIdx];
                  const isHeader = cell?.isHeader ?? false;
                  return (
                    <View
                      key={rowIdx}
                      style={{
                        justifyContent: 'center',
                        minHeight: 40,
                        paddingVertical: spacing.xs,
                        paddingHorizontal: spacing.sm,
                        backgroundColor: isHeader ? headBg : undefined,
                        borderBottomWidth: rowIdx < rows.length - 1 ? 1 : 0,
                        borderColor: border,
                      }}
                    >
                      <Text style={{ color: isHeader ? headFg : cellFg, fontWeight: isHeader ? '700' : '400', fontSize: 16 }}>{cell?.text ?? ''}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </HugWidthScrollFade>
        </View>
      );
    },
  };
}
