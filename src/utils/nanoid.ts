const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function nanoid(size = 21): string {
  // Rejection sampling with a 6-bit mask (alphabet length 62): bytes landing on
  // the 2 out-of-range indices are skipped rather than folded with `% 62`, which
  // would over-represent the first 8 characters (A–H). Matches real nanoid.
  const mask = 63;
  let id = '';
  while (id.length < size) {
    const bytes = crypto.getRandomValues(new Uint8Array(size));
    for (let i = 0; i < size && id.length < size; i++) {
      const idx = bytes[i] & mask;
      if (idx < alphabet.length) id += alphabet[idx];
    }
  }
  return id;
}
