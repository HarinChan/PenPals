import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Post } from '../PostCreator';
import type { Account, Classroom } from '../../types';

const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => mockToastError(...args),
    success: vi.fn(),
  },
}));

vi.mock('../ClassroomDetailDialog', () => ({
  default: ({ open, classroom }: { open: boolean; classroom: { name?: string } | null }) =>
    open ? <div data-testid="classroom-dialog">{classroom?.name}</div> : null,
}));

vi.mock('../ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

import PostFeed from '../PostFeed';

const makePost = (overrides: Partial<Post> = {}): Post => ({
  id: 'p-1',
  authorId: '101',
  authorName: 'Alice',
  content: 'Original post content',
  timestamp: new Date(Date.now() - 10 * 60 * 1000),
  likes: 0,
  comments: 0,
  ...overrides,
});

const mockAccount: Account = {
  id: '999',
  classroomName: 'My Class',
  location: 'London',
  x: 0,
  y: 0,
  size: 20,
  description: 'Test class',
  interests: [],
  schedule: {},
  friends: [],
};

const makeClassroom = (overrides: Partial<Classroom> = {}): Classroom => ({
  id: '101',
  name: 'Classroom 101',
  location: 'Paris',
  lat: 48.85,
  lon: 2.35,
  interests: ['math'],
  availability: { Mon: [9] },
  ...overrides,
});

const renderPostFeed = (overrides: Partial<React.ComponentProps<typeof PostFeed>> = {}) => {
  const onDeletePost = vi.fn();

  render(
    <PostFeed
      posts={[makePost()]}
      currentUserId="999"
      onDeletePost={onDeletePost}
      currentAccount={mockAccount}
      classrooms={[]}
      onAccountUpdate={vi.fn()}
      {...overrides}
    />,
  );

  return { onDeletePost };
};

describe('PostFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows empty state when there are no posts', () => {
    renderPostFeed({ posts: [] });

    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });

  it('shows delete button for own post and calls onDeletePost', async () => {
    const user = userEvent.setup();
    const { onDeletePost } = renderPostFeed({
      posts: [makePost({ id: 'p-own', authorId: 'me-1' })],
      currentUserId: 'me-1',
    });

    await user.click(screen.getByTitle(/delete post/i));

    expect(onDeletePost).toHaveBeenCalledWith('p-own');
  });

  it('loads classroom details when clicking another author avatar', async () => {
    const user = userEvent.setup();
    const classroom = makeClassroom({ id: '101', name: 'Classroom 101' });

    renderPostFeed({
      posts: [makePost({ authorId: '101', authorName: 'Alice' })],
      currentUserId: '999',
      classrooms: [classroom],
    });

    const avatarButton = screen.getByTitle("View Alice's classroom");
    await user.click(avatarButton);

    await waitFor(() => {
      expect(screen.getByTestId('classroom-dialog')).toHaveTextContent('Classroom 101');
    });
  });

  it('shows toast error when classroom details fetch fails', async () => {
    const user = userEvent.setup();

    // No matching classroom in the list → should show error
    renderPostFeed({
      posts: [makePost({ authorName: 'Bob', authorId: '202' })],
      currentUserId: '999',
      classrooms: [],
    });

    await user.click(screen.getByTitle("View Bob's classroom"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Could not load classroom details.');
    });
  });

  it('translates post content and can revert to original', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        responseStatus: 200,
        responseData: { translatedText: 'Contenu traduit' },
      }),
    } as any);

    renderPostFeed({ posts: [makePost({ id: 'p-translate', content: 'Original text' })] });

    await user.click(screen.getByTitle('Translate'));
    await user.click(screen.getByRole('button', { name: /english/i }));

    await waitFor(() => {
      expect(screen.getByText('Contenu traduit')).toBeInTheDocument();
      expect(screen.getByText(/translated · click to revert/i)).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Show original'));

    expect(screen.getByText('Original text')).toBeInTheDocument();
  });

  it('shows toast error when translation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({ ok: false } as any);

    renderPostFeed({ posts: [makePost({ id: 'p-fail', content: 'Needs translation' })] });

    await user.click(screen.getByTitle('Translate'));
    await user.click(screen.getByRole('button', { name: /english/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Translation failed. Please try again.');
    });
  });
});
