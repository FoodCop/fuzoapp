/**
 * SECTION: Shared Studio Helpers
 * A centralized utility layer used across all immersive AI Studios (Snap, Bites, Trims).
 * These helpers manage the bridge between hardware interfaces (Camera/File System) 
 * and the neural synthesis pipeline (Gemini API).
 */

/**
 * SUB-SECTION: Media Processing
 * Reads an image File object (from Camera or Upload) and converts it to a 
 * base64 data URL string for preview and AI analysis.
 */
export const readImageFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result as string);
  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

/**
 * SUB-SECTION: State Orchestration
 * Loads an uploaded image file into a React state setter and triggers 
 * the next step in the studio wizard flow.
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
 * SUB-SECTION: Neural Response Parsing
 * Safely parses AI-generated JSON responses from the Gemini API.
 * Intelligence: 
 * 1. Handles direct JSON strings.
 * 2. Extracts JSON from Markdown code blocks (```json ... ```) if necessary.
 * 3. Provides a fallback null instead of throwing errors during the synthesis flow.
 */
export const parseAiJson = (raw: string | undefined | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // Regex fallback to extract the first balanced JSON object from malformed strings
    const extracted = /\{[\s\S]*\}/.exec(raw)?.[0];
    if (!extracted) return null;
    try {
      return JSON.parse(extracted);
    } catch {
      return null;
    }
  }
};
