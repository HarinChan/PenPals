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
  onCreatePost: (content: string, imageUrl?: string) => void;
  isLoading?: boolean;
}

export default function FeedPanel({
  currentUserName,
  currentUserId,
  allPosts,
  myPosts,
  onCreatePost,
  isLoading,
}: FeedPanelProps) {
  return (
    <div className="space-y-4">
      <PostCreator
        onCreatePost={onCreatePost}
        authorName={currentUserName}
      />

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-slate-100 dark:bg-slate-900">
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

          <TabsContent value="all" className="p-4">
            <PostFeed posts={allPosts} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="my" className="p-4">
            <PostFeed posts={myPosts} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="search" className="p-4">
            <PostSearch />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
