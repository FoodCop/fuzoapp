export interface TrimVideo {
  id: string;
  videoId: string;
  title: string;
  author: string;
  likes: string;
  img: string;
}

export type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
    };
  };
};
