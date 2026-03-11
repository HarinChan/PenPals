import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Post } from '../PostCreator';

vi.mock('../PostCreator', () => ({
  default: ({ onCreatePost, authorName, authorAvatar }: any) => (
    <div data-testid="post-creator">
      <span>{authorName}</span>
      <span>{authorAvatar ?? 'no-avatar'}</span>
      <button type="button" onClick={() => onCreatePost('Created from mock', 'https://img.test/x.png')}>
        create-from-mock
      </button>
    </div>
  ),
}));

vi.mock('../PostFeed', () => ({
  default: ({ posts, isLoading, currentUserId, onDeletePost }: any) => (
    <div data-testid="post-feed">
      <div>posts:{posts.map((post: any) => post.id).join(',')}</div>
      <div>loading:{String(Boolean(isLoading))}</div>
      <div>currentUserId:{currentUserId}</div>
      <button type="button" onClick={() => onDeletePost(posts[0]?.id ?? 'none')}>
        delete-from-mock
      </button>
    </div>
  ),
}));

vi.mock('../PostSearch', () => ({
  default: () => <div data-testid="post-search">post-search-content</div>,
}));

import FeedPanel from '../FeedPanel';

const makePost = (overrides: Partial<Post> = {}): Post => ({
  id: 'p-1',
  authorId: 'u-1',
  authorName: 'Alice',
  content: 'Hello post',
  timestamp: new Date('2026-03-08T10:00:00.000Z'),
  likes: 0,
  comments: 0,
  ...overrides,
});

const renderFeedPanel = (overrides: Partial<React.ComponentProps<typeof FeedPanel>> = {}) => {
  const onCreatePost = vi.fn();
  const onDeletePost = vi.fn();

  render(
    <FeedPanel
      currentUserName="Teacher One"
      currentUserId="me-123"
      currentUserAvatar="🎓"
      allPosts={[makePost({ id: 'all-1' }), makePost({ id: 'all-2' })]}
      myPosts={[makePost({ id: 'my-1', authorId: 'me-123' })]}
      onCreatePost={onCreatePost}
      onDeletePost={onDeletePost}
      isLoading={false}
      {...overrides}
    />,
  );

  return { onCreatePost, onDeletePost };
};

describe('FeedPanel', () => {
  it('renders PostCreator with current user props and forwards create callback', async () => {
    const user = userEvent.setup();
    const { onCreatePost } = renderFeedPanel();

    expect(screen.getByTestId('post-creator')).toBeInTheDocument();
    expect(screen.getByText('Teacher One')).toBeInTheDocument();
    expect(screen.getByText('🎓')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'create-from-mock' }));

    expect(onCreatePost).toHaveBeenCalledWith('Created from mock', 'https://img.test/x.png');
  });

  it('shows All Posts tab by default and passes allPosts/currentUserId/isLoading to PostFeed', () => {
    renderFeedPanel({ isLoading: true });

    expect(screen.getByText('posts:all-1,all-2')).toBeInTheDocument();
    expect(screen.getByText('loading:true')).toBeInTheDocument();
    expect(screen.getByText('currentUserId:me-123')).toBeInTheDocument();
  });

  it('switches to My Posts tab and passes myPosts to PostFeed', async () => {
    const user = userEvent.setup();
    renderFeedPanel();

    await user.click(screen.getByRole('tab', { name: /my posts/i }));

    expect(screen.getByText('posts:my-1')).toBeInTheDocument();
  });

  it('switches to Search tab and renders PostSearch', async () => {
    const user = userEvent.setup();
    renderFeedPanel();

    await user.click(screen.getByRole('tab', { name: /search/i }));

    expect(screen.getByTestId('post-search')).toBeInTheDocument();
    expect(screen.getByText('post-search-content')).toBeInTheDocument();
  });

  it('forwards delete callback from active PostFeed', async () => {
    const user = userEvent.setup();
    const { onDeletePost } = renderFeedPanel();

    await user.click(screen.getByRole('button', { name: 'delete-from-mock' }));

    expect(onDeletePost).toHaveBeenCalledWith('all-1');
  });
});
