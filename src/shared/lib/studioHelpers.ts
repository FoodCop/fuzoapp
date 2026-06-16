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
  reader.onloadend = () => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIMENSION = 1080;
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        resolve(reader.result as string);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = reader.result as string;
  };
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
 * SUB-SECTION: Media Processing (Video)
 * Reads a video File object and converts it to a base64 data URL string.
 * Does not attempt to load it into an Image object or resize via Canvas.
 */
export const readVideoFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    if (reader.result) {
      resolve(reader.result as string);
    } else {
      reject(new Error('Failed to load video file'));
    }
  };
  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

/**
 * SUB-SECTION: Media Processing (Video Frame Extraction)
 * Extracts a single frame (thumbnail) from a video file using a hidden video element and canvas.
 */
export const extractVideoFrameAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);

  video.onloadeddata = () => {
    video.currentTime = Math.min(1, video.duration / 2); // Extract frame at 1 second or halfway
  };

  video.onseeked = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    } else {
      reject(new Error('Failed to get canvas context for video frame extraction'));
    }
    URL.revokeObjectURL(url);
  };

  video.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Failed to load video for frame extraction'));
  };

  video.src = url;
  video.load();
});

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
