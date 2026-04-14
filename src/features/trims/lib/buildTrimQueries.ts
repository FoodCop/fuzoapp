const normalizeTokens = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
};

export const buildTrimQueries = (params: {
  location?: string;
  cuisine?: string;
  diet?: string;
}) => {
  const location = (params.location || '').trim();
  const cuisines = normalizeTokens(params.cuisine);
  
  const cuisinePrimary = cuisines[0] || '';
  const locationSuffix = location ? `in ${location}` : '';

  const raw = [
    `Street food ${cuisinePrimary} ${locationSuffix} shorts`,
    `recipes cooking videos ${cuisinePrimary} ${locationSuffix} shorts`,
    `kitchen tips ${cuisinePrimary} shorts`,
    `trending restaurants ${locationSuffix} shorts`,
  ];

  return Array.from(new Set(raw.map((query) => query.replace(/\s+/g, ' ').trim()))).slice(0, 4);
};
