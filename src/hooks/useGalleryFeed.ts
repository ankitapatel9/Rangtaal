import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { toEpochMs } from "../lib/formatTime";

export interface GalleryFeedItem {
  id: string;
  type: "photo" | "video";
  source: "media" | "tutorial";
  storageUrl: string;
  thumbnailUrl?: string | null;
  title?: string;
  description?: string;
  sessionId: string;
  uploadedBy: string;
  uploadedAt: number;
}

export interface GalleryFeedState {
  items: GalleryFeedItem[];
  loading: boolean;
}

/**
 * Merges both `media` and `tutorials` collections into a single
 * chronological feed, newest first.
 */
export function useGalleryFeed(): GalleryFeedState {
  const [mediaItems, setMediaItems] = useState<GalleryFeedItem[]>([]);
  const [tutorialItems, setTutorialItems] = useState<GalleryFeedItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [tutorialLoading, setTutorialLoading] = useState(true);

  useEffect(() => {
    const unsubMedia = firestore()
      .collection("media")
      .orderBy("uploadedAt", "desc")
      .onSnapshot(
        (snap) => {
          if (!snap) { setMediaLoading(false); return; }
          const items: GalleryFeedItem[] = snap.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              type: d.type ?? "photo",
              source: "media" as const,
              storageUrl: d.storageUrl ?? "",
              thumbnailUrl: d.thumbnailUrl ?? null,
              sessionId: d.sessionId ?? "",
              uploadedBy: d.uploadedBy ?? "",
              uploadedAt: toEpochMs(d.uploadedAt),
            };
          });
          setMediaItems(items);
          setMediaLoading(false);
        },
        () => { setMediaItems([]); setMediaLoading(false); }
      );

    const unsubTutorials = firestore()
      .collection("tutorials")
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) => {
          if (!snap) { setTutorialLoading(false); return; }
          const items: GalleryFeedItem[] = snap.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              type: "video" as const,
              source: "tutorial" as const,
              storageUrl: d.videoUrl ?? "",
              thumbnailUrl: d.thumbnailUrl ?? null,
              title: d.title ?? "",
              description: d.description ?? "",
              sessionId: d.sessionId ?? "",
              uploadedBy: d.createdBy ?? "",
              uploadedAt: toEpochMs(d.createdAt),
            };
          });
          setTutorialItems(items);
          setTutorialLoading(false);
        },
        () => { setTutorialItems([]); setTutorialLoading(false); }
      );

    return () => { unsubMedia(); unsubTutorials(); };
  }, []);

  // Merge and sort by uploadedAt desc
  const merged = [...mediaItems, ...tutorialItems].sort(
    (a, b) => b.uploadedAt - a.uploadedAt
  );

  return {
    items: merged,
    loading: mediaLoading || tutorialLoading,
  };
}
