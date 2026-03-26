export const normalizeExternalUrl = (value: string | undefined, baseUrl: string) => {
  if (!value) return baseUrl;
  const trimmed = value.trim();
  if (!trimmed) return baseUrl;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('@')) return `${baseUrl}/${trimmed.slice(1)}`;
  if (trimmed.includes('.')) return `https://${trimmed}`;
  return `${baseUrl}/${trimmed}`;
};
