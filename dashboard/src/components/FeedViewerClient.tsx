"use client";

import dynamic from 'next/dynamic';

// Dynamically import FeedViewer with SSR disabled so that isomorphic-dompurify
// (which depends on jsdom) is never resolved on the server.
const FeedViewer = dynamic(() => import('./FeedViewer'), { ssr: false });

export default function FeedViewerClient({ posts }: { posts: any[] }) {
  return <FeedViewer posts={posts} />;
}
