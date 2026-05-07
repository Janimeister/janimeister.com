export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  publishedAt: string; // ISO
  description?: string;
}

export interface ChannelData {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  fetchedAt: string;
  videos: Video[];
}
