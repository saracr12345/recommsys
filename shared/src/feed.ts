export interface RawFeedItem {
    id: string;
    title: string;
    summary?: string;
    link?: string;
    source: string;
    type: "blog" | "paper";
    date?: string;
  }
      