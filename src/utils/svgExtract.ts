// Strips the outer <svg>...</svg> wrapper from a standalone SVG string and
// returns the inner markup so it can be inlined into another <svg> element via
// React's dangerouslySetInnerHTML.
//
// When `idPrefix` is provided, every `id="X"` declaration and every reference
// (`url(#X)`, `href="#X"`, `xlink:href="#X"`) inside the inner markup is
// rewritten to use `${idPrefix}-X`. This is used to avoid SVG id collisions
// when multiple CoffeeCup instances are mounted in the same DOM (e.g. the
// 6-tile picker grid + the live focus-screen cup behind the modal).

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip active content from an SVG body before it is inlined via
 * dangerouslySetInnerHTML. Coffee-cup art can be fetched from a server-provided
 * `svg_url`, and the WebView has no CSP (`csp: null`), so an unsanitized payload
 * could run script through `<script>`, an `<img onerror>` inside `<foreignObject>`,
 * or a SMIL `onbegin` handler. Static cup art never uses any of these, so this is
 * a no-op on legitimate variants. Regex sanitization isn't a substitute for a
 * real CSP/DOMPurify, but it removes the concrete execution vectors here.
 */
function sanitizeSvg(markup: string): string {
  return markup
    // Dangerous elements, with or without content.
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/<foreignObject\b[^>]*\/?>/gi, '')
    // SMIL animation elements can carry on* handlers / trigger scripts.
    .replace(/<(?:animateTransform|animateMotion|animate|set)\b[\s\S]*?\/?>/gi, '')
    .replace(/<\/(?:animateTransform|animateMotion|animate|set)\s*>/gi, '')
    // Inline event handlers (on*="…" / '…' / unquoted).
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    // Neutralize javascript: URLs in href / xlink:href.
    .replace(/(href\s*=\s*)("|')\s*javascript:[^"']*\2/gi, '$1$2#$2');
}

export function extractInnerSvg(fullSvg: string, idPrefix?: string): string {
  let inner = sanitizeSvg(
    fullSvg
      .replace(/^[\s\S]*?<svg\b[^>]*>/i, '')
      .replace(/<\/svg>\s*$/i, '')
  );

  if (!idPrefix) return inner;

  const ids = new Set<string>();
  const idRe = /\bid\s*=\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(inner)) !== null) {
    ids.add(m[1]);
  }

  for (const id of ids) {
    const safe = escapeRegex(id);
    const prefixed = `${idPrefix}-${id}`;
    inner = inner
      .replace(new RegExp(`\\bid\\s*=\\s*"${safe}"`, 'g'), `id="${prefixed}"`)
      .replace(new RegExp(`url\\(#${safe}\\)`, 'g'), `url(#${prefixed})`)
      .replace(new RegExp(`xlink:href\\s*=\\s*"#${safe}"`, 'g'), `xlink:href="#${prefixed}"`)
      .replace(new RegExp(`(^|[^:])\\bhref\\s*=\\s*"#${safe}"`, 'g'), `$1href="#${prefixed}"`);
  }

  return inner;
}
