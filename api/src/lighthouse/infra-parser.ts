export function analyzeImages(html: string) {
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)];
  let imagesTotal = 0;
  let imagesModernFormat = 0;
  let imagesWithLazy = 0;
  let imagesWithDimensions = 0;
  let imagesWithAlt = 0;

  for (const m of imgTags) {
    const tag = m[0];
    imagesTotal++;

    if (/\.(webp|avif)(\?|"|'|\s|>)/i.test(tag)) {
      imagesModernFormat++;
    }
    if (/\bloading=["']lazy["']/i.test(tag)) {
      imagesWithLazy++;
    }
    if (/\bwidth=["']?\d+/i.test(tag) && /\bheight=["']?\d+/i.test(tag)) {
      imagesWithDimensions++;
    }
    if (/\balt=["'][^"']+["']/i.test(tag)) {
      imagesWithAlt++;
    }
  }

  let imageScore = 100;
  if (imagesTotal > 0) {
    const modernPct = imagesModernFormat / imagesTotal;
    const lazyPct = imagesWithLazy / imagesTotal;
    const dimsPct = imagesWithDimensions / imagesTotal;
    const altPct = imagesWithAlt / imagesTotal;
    imageScore = Math.round(modernPct * 35 + lazyPct * 20 + dimsPct * 25 + altPct * 20);
  }

  return {
    total: imagesTotal,
    modernFormat: imagesModernFormat,
    lazyLoading: imagesWithLazy,
    withDimensions: imagesWithDimensions,
    withAlt: imagesWithAlt,
    score: imageScore,
    recommendation:
      imagesTotal === 0
        ? "Sem imagens detectadas na página inicial"
        : imageScore >= 90
        ? "Imagens bem otimizadas"
        : imageScore >= 50
        ? "Algumas otimizações pendentes (WebP/AVIF, lazy loading, dimensões)"
        : "Imagens precisam de otimização urgente",
  };
}

export function analyzeFonts(html: string) {
  const usesGoogleFonts = /fonts\.googleapis\.com/i.test(html);
  const localFontsCount = [
    ...html.matchAll(/url\(["']?([^"')]+\.(woff2?|ttf|otf))["']?\)/gi),
  ].length;
  const usesLocalFonts = localFontsCount > 0;
  const hasFontDisplay = /font-display\s*:\s*(swap|fallback|optional)/i.test(html);
  const hasFontPreload = /<link[^>]*rel=["']preload["'][^>]*as=["']font["']/i.test(html);
  const hasWoff2 = /\.woff2/i.test(html);

  let score = 0;
  if (usesGoogleFonts) score += 15;
  if (usesLocalFonts) score += 25;
  if (hasFontDisplay) score += 20;
  if (hasFontPreload) score += 20;
  if (hasWoff2) score += 20;
  if (!usesGoogleFonts && !usesLocalFonts) score = 100;

  const fontScore = Math.min(score, 100);

  return {
    usesGoogleFonts,
    localFontsCount,
    hasFontDisplay,
    hasFontPreload,
    hasWoff2,
    score: fontScore,
    recommendation:
      fontScore >= 90
        ? "Fontes bem otimizadas"
        : fontScore >= 50
        ? "Algumas melhorias possíveis (font-display, preload, woff2)"
        : usesGoogleFonts
        ? "Considere hospedar fontes localmente (mais rápido)"
        : "Fontes precisam de otimização",
  };
}
