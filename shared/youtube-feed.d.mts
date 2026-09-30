export interface FeedVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  publishedAt: string;
  description?: string;
}

export function fetchViaApi(
  channelId: string,
  apiKey: string,
  options: { userAgent: string },
): Promise<FeedVideo[]>;

export function fetchViaRss(
  channelId: string,
  options: { userAgent: string; init?: RequestInit },
): Promise<FeedVideo[]>;

export function parseFeed(xml: string): FeedVideo[];

export function decodeEntities(s: string): string;
