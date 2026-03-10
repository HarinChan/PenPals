import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQueryPostsFromChromaDB = vi.fn();

vi.mock('../../services/chromadb', () => ({
  queryPostsFromChromaDB: (...args: any[]) => mockQueryPostsFromChromaDB(...args),
}));

import PostSearch from '../PostSearch';

describe('PostSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input and disabled search button initially', () => {
    render(<PostSearch />);

    expect(screen.getByPlaceholderText(/search posts by content/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeDisabled();
  });

  it('performs search and renders mapped results', async () => {
    const user = userEvent.setup();
    mockQueryPostsFromChromaDB.mockResolvedValue({
      status: 'success',
      results: [
        {
          id: 'r-1',
          document: 'Matched semantic content',
          metadata: {
            authorName: 'Alice',
            timestamp: '2026-03-08T12:00:00.000Z',
            imageUrl: 'https://example.com/1.jpg',
          },
          similarity: 0.83,
        },
      ],
    });

    render(<PostSearch />);

    await user.type(screen.getByPlaceholderText(/search posts by content/i), 'semantic query');
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => {
      expect(mockQueryPostsFromChromaDB).toHaveBeenCalledWith('semantic query', 10);
      expect(screen.getByText('Search Results')).toBeInTheDocument();
      expect(screen.getByText('1 result found')).toBeInTheDocument();
      expect(screen.getByText('Matched semantic content')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('83% match')).toBeInTheDocument();
      expect(screen.getByText(/contains image/i)).toBeInTheDocument();
    });
  });

  it('uses fallback author when metadata authorName is missing', async () => {
    const user = userEvent.setup();
    mockQueryPostsFromChromaDB.mockResolvedValue({
      status: 'success',
      results: [
        {
          id: 'r-2',
          document: 'Fallback author content',
          metadata: {
            author: 'Fallback Author',
            timestamp: '2026-03-08T12:00:00.000Z',
          },
          similarity: 0.64,
        },
      ],
    });

    render(<PostSearch />);

    await user.type(screen.getByPlaceholderText(/search posts by content/i), 'fallback');
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    expect(await screen.findByText('Fallback Author')).toBeInTheDocument();
  });

  it('shows no results message when successful search returns empty list', async () => {
    const user = userEvent.setup();
    mockQueryPostsFromChromaDB.mockResolvedValue({ status: 'success', results: [] });

    render(<PostSearch />);

    await user.type(screen.getByPlaceholderText(/search posts by content/i), 'nothing');
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    expect(await screen.findByText(/no posts found matching your search/i)).toBeInTheDocument();
  });

  it('clears query and results when clear button is clicked', async () => {
    const user = userEvent.setup();
    mockQueryPostsFromChromaDB.mockResolvedValue({
      status: 'success',
      results: [
        {
          id: 'r-clear',
          document: 'to clear',
          metadata: { authorName: 'A', timestamp: '2026-03-08T12:00:00.000Z' },
          similarity: 0.8,
        },
      ],
    });

    render(<PostSearch />);

    const input = screen.getByPlaceholderText(/search posts by content/i) as HTMLInputElement;
    await user.type(input, 'clear me');
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    expect(await screen.findByText('Search Results')).toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: '' });
    await user.click(clearButton);

    expect(input.value).toBe('');
    expect(screen.queryByText('Search Results')).not.toBeInTheDocument();
  });
});
