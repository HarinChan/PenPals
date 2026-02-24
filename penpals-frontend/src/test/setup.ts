import '@testing-library/jest-dom';
import { expect, afterEach, vi, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';

// Setup crypto mock before anything else
beforeAll(() => {
  // Create a proper mock that returns a valid ArrayBuffer
  const mockArrayBuffer = new ArrayBuffer(32);
  const mockUint8Array = new Uint8Array(mockArrayBuffer);
  // Fill with deterministic values
  for (let i = 0; i < 32; i++) {
    mockUint8Array[i] = i;
  }

  const mockDigest = vi.fn(async () => mockArrayBuffer);

  // Use Object.defineProperty to override the read-only subtle property
  if (globalThis.crypto) {
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: {
        digest: mockDigest,
      },
      writable: true,
      configurable: true,
    });
  } else {
    globalThis.crypto = {
      subtle: {
        digest: mockDigest,
      },
    } as any;
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_CLIENT_HASH_SALT: 'test-salt',
  },
  writable: true,
});



