import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PostCreator from '../PostCreator';

const renderPostCreator = (overrides: Partial<React.ComponentProps<typeof PostCreator>> = {}) => {
  const onCreatePost = vi.fn();

  render(
    <PostCreator
      onCreatePost={onCreatePost}
      authorName="Alice Johnson"
      authorAvatar="🦊"
      {...overrides}
    />,
  );

  return { onCreatePost };
};

describe('PostCreator', () => {
  it('renders placeholder with first name and disabled submit initially', () => {
    renderPostCreator();

    expect(screen.getByPlaceholderText("What's on your mind, Alice?")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post/i })).toBeDisabled();
  });

  it('enables submit when content is entered and submits text-only post', async () => {
    const user = userEvent.setup();
    const { onCreatePost } = renderPostCreator();

    const textarea = screen.getByPlaceholderText("What's on your mind, Alice?");
    await user.type(textarea, 'Hello from class A');

    const postButton = screen.getByRole('button', { name: /post/i });
    expect(postButton).not.toBeDisabled();

    await user.click(postButton);

    expect(onCreatePost).toHaveBeenCalledWith('Hello from class A', undefined);
  });

  it('toggles image input, previews image, and submits with image URL', async () => {
    const user = userEvent.setup();
    const { onCreatePost } = renderPostCreator();

    await user.click(screen.getByRole('button', { name: /add image/i }));

    const imageInput = screen.getByPlaceholderText('Paste image URL…');
    await user.type(imageInput, 'https://example.com/photo.jpg');

    expect(screen.getByAltText('Post preview')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("What's on your mind, Alice?");
    await user.type(textarea, 'Photo update');
    await user.click(screen.getByRole('button', { name: /post/i }));

    expect(onCreatePost).toHaveBeenCalledWith('Photo update', 'https://example.com/photo.jpg');
  });

  it('resets content and hides image input after successful submit', async () => {
    const user = userEvent.setup();
    renderPostCreator();

    await user.click(screen.getByRole('button', { name: /add image/i }));
    await user.type(screen.getByPlaceholderText('Paste image URL…'), 'https://example.com/pic.png');

    const textarea = screen.getByPlaceholderText("What's on your mind, Alice?") as HTMLTextAreaElement;
    await user.type(textarea, 'Reset me');
    await user.click(screen.getByRole('button', { name: /post/i }));

    expect(textarea.value).toBe('');
    expect(screen.queryByPlaceholderText('Paste image URL…')).not.toBeInTheDocument();
  });

  it('clears and hides image input when close image button is clicked', async () => {
    const user = userEvent.setup();
    renderPostCreator();

    await user.click(screen.getByRole('button', { name: /add image/i }));
    const imageInput = screen.getByPlaceholderText('Paste image URL…') as HTMLInputElement;
    await user.type(imageInput, 'https://example.com/clear.jpg');

    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find((button) => button !== screen.getByRole('button', { name: /post/i }) && button !== screen.getByRole('button', { name: /hide image/i }));
    expect(closeButton).toBeDefined();
    if (closeButton) await user.click(closeButton);

    expect(screen.queryByPlaceholderText('Paste image URL…')).not.toBeInTheDocument();
  });
});
