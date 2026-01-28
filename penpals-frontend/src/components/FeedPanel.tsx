import { useRef } from 'react';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import PostCreator, { Post } from './PostCreator';
import PostFeed from './PostFeed';
import PostSearch from './PostSearch';

interface FeedPanelProps {
  currentUserName: string;
  currentUserId: string;
  allPosts: Post[];
  myPosts: Post[];
  onCreatePost: (content: string) => void;
  onLikePost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onEditPost: (postId: string, newContent: string) => void;
  likedPosts?: Set<string>;
}

export default function FeedPanel({
  currentUserName,
  currentUserId,
  allPosts,
  myPosts,
  onCreatePost,
  onLikePost,
  onDeletePost,
  onEditPost,
  likedPosts,
}: FeedPanelProps) {
  const postCreatorRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-slate-100 dark:bg-slate-900 sticky top-0 z-10">
            <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">
              All Posts
            </TabsTrigger>
            <TabsTrigger value="my" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">
              My Posts
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100">
              Search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="p-0 m-0">
            <PostFeed 
              posts={allPosts} 
              onLikePost={onLikePost} 
              onDeletePost={onDeletePost}
              onEditPost={onEditPost}
              likedPosts={likedPosts}
              currentUserId={currentUserId}
            />
          </TabsContent>

          <TabsContent value="my" className="p-0 m-0">
            <PostFeed 
              posts={myPosts} 
              onLikePost={onLikePost} 
              onDeletePost={onDeletePost}
              onEditPost={onEditPost}
              likedPosts={likedPosts}
              currentUserId={currentUserId}
            />
          </TabsContent>

          <TabsContent value="search" className="p-4">
            <PostSearch 
              currentUserId={currentUserId}
              onDeletePost={onDeletePost}
              onEditPost={onEditPost}
            />
          </TabsContent>
        </Tabs>
      </div>

      <div ref={postCreatorRef} className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg">
        <PostCreator 
          onCreatePost={onCreatePost} 
          authorName={currentUserName}
        />
      </div>
    </div>
  );
}
