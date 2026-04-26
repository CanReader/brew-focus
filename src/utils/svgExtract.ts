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

export function extractInnerSvg(fullSvg: string, idPrefix?: string): string {
  let inner = fullSvg
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '');

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
