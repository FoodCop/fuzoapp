/**
 * Shared Studio Helpers
 * Utilities used across multiple AI Studios (Snap, Bites, Trims).
 */

/**
 * Reads an image File object and returns a base64 data URL string.
 */
export const readImageFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result as string);
  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

/**
 * Loads an uploaded image file into state and fires a callback on success.
 */
export const loadUploadedImage = async (
  file: File,
  setCapturedImage: React.Dispatch<React.SetStateAction<string | null>>,
  onTagged: () => void,
) => {
  const imageData = await readImageFileAsDataUrl(file);
  setCapturedImage(imageData);
  onTagged();
};

/**
 * Safely parses AI-generated JSON responses.
 * Handles both clean JSON and JSON embedded in markdown code fences.
 */
export const parseAiJson = (raw: string | undefined | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const extracted = /\{[\s\S]*\}/.exec(raw)?.[0];
    if (!extracted) return null;
    try {
      return JSON.parse(extracted);
    } catch {
      return null;
    }
  }
};
