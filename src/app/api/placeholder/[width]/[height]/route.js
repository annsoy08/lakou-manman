export async function GET(_request, { params }) {
  const width = Number(params.width) || 320;
  const height = Number(params.height) || 180;

  const safeWidth = Math.min(Math.max(width, 40), 1600);
  const safeHeight = Math.min(Math.max(height, 40), 1600);
  const fontSize = Math.max(12, Math.round(Math.min(safeWidth, safeHeight) / 8));

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e0f2fe" />
          <stop offset="100%" stop-color="#fce7f3" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" rx="16" />
      <rect x="8" y="8" width="${safeWidth - 16}" height="${safeHeight - 16}" fill="none" stroke="#cbd5e1" stroke-width="2" rx="12" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600">
        Lakou Manman
      </text>
    </svg>
  `;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
