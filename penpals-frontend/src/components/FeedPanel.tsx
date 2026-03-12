import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import PostCreator, { Post } from './PostCreator';
import PostFeed from './PostFeed';
import PostSearch from './PostSearch';
import type { Account, Classroom } from '../types';

interface FeedPanelProps {
  currentUserName: string;
  currentUserId: string;
  currentUserAvatar?: string;
  allPosts: Post[];
  myPosts: Post[];
  onCreatePost: (content: string, files?: File[]) => Promise<void> | void;
  onDeletePost: (postId: string) => void;
  isLoading?: boolean;
  currentAccount: Account;
  classrooms: Classroom[];
  onAccountUpdate: (account: Account) => void;
}

export default function FeedPanel({
  currentUserName,
  currentUserId,
  currentUserAvatar,
  allPosts,
  myPosts,
  onCreatePost,
  onDeletePost,
  isLoading,
  currentAccount,
  classrooms,
  onAccountUpdate,
}: FeedPanelProps) {
  return (
    <div className="space-y-4">
      <PostCreator
        onCreatePost={onCreatePost}
        authorName={currentUserName}
        authorAvatar={currentUserAvatar}
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
            <PostFeed posts={allPosts} isLoading={isLoading} currentUserId={currentUserId} onDeletePost={onDeletePost} currentAccount={currentAccount} classrooms={classrooms} onAccountUpdate={onAccountUpdate} />
          </TabsContent>

          <TabsContent value="my" className="p-4">
            <PostFeed posts={myPosts} isLoading={isLoading} currentUserId={currentUserId} onDeletePost={onDeletePost} currentAccount={currentAccount} classrooms={classrooms} onAccountUpdate={onAccountUpdate} />
          </TabsContent>

          <TabsContent value="search" className="p-4">
            <PostSearch currentAccount={currentAccount} classrooms={classrooms} onAccountUpdate={onAccountUpdate} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
