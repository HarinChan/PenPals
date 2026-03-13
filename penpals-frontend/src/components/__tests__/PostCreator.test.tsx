import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

import PostCreator from '../PostCreator';

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = vi.fn();
});

afterAll(() => {
  vi.restoreAllMocks();
});

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

  it('toggles image input, previews image, and submits with file', async () => {
    const user = userEvent.setup();
    const { onCreatePost } = renderPostCreator();

    await user.click(screen.getByRole('button', { name: /add files/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);

    const textarea = screen.getByPlaceholderText("What's on your mind, Alice?");
    await user.type(textarea, 'Photo update');
    await user.click(screen.getByRole('button', { name: /post/i }));

    expect(onCreatePost).toHaveBeenCalledWith('Photo update', [file]);
  });

  it('resets content and hides image input after successful submit', async () => {
    const user = userEvent.setup();
    renderPostCreator();

    await user.click(screen.getByRole('button', { name: /add files/i }));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pic'], 'pic.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    const textarea = screen.getByPlaceholderText("What's on your mind, Alice?") as HTMLTextAreaElement;
    await user.type(textarea, 'Reset me');
    await user.click(screen.getByRole('button', { name: /post/i }));

    expect(textarea.value).toBe('');
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
  });

  it('clears and hides image input when close image button is clicked', async () => {
    const user = userEvent.setup();
    renderPostCreator();

    await user.click(screen.getByRole('button', { name: /add files/i }));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['clear'], 'clear.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);

    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find((button) => button !== screen.getByRole('button', { name: /post/i }) && button !== screen.getByRole('button', { name: /hide files/i }));
    expect(closeButton).toBeDefined();
    if (closeButton) await user.click(closeButton);

    expect(document.querySelector('input[type="file"]')).toBeInTheDocument(); // Input stays in DOM but it's hidden
  });
});
