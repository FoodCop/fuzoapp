/**
 * Utility functions for handling video URLs and embedding logic.
 */

/**
 * Extracts the YouTube Video ID from various URL formats.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
export const extractYouTubeId = (url: string | null | undefined): string | null => {
  if (!url) return null;

  // Regular expression to handle various YouTube URL formats
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[7].length === 11) {
    return match[7];
  }

  // Handle Shorts specifically if regExp fails
  if (url.includes('/shorts/')) {
    const parts = url.split('/shorts/');
    const id = parts[1]?.split(/[?#&]/)[0];
    if (id && id.length === 11) return id;
  }

  return null;
};
