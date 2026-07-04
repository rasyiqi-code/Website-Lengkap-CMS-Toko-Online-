import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArchiveProductButton } from '@/modules/catalog/ui/shop/ArchiveProductButton';
import { archiveProductAction } from '@/modules/catalog/actions/product.actions';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/modules/catalog/actions/product.actions', () => ({
  archiveProductAction: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Portal to just render children directly for testing
vi.mock('@/modules/shared/ui/ui/Portal', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ArchiveProductButton', () => {
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ refresh: mockRefresh });
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders archive button when not archived', () => {
    render(
      <ArchiveProductButton productId="p-1" productName="Test Product" isArchived={false} />
    );

    const button = screen.getByTitle('Archive Asset');
    expect(button).toBeInTheDocument();
  });

  it('renders unarchive button when archived', () => {
    render(
      <ArchiveProductButton productId="p-1" productName="Test Product" isArchived={true} />
    );

    const button = screen.getByTitle('Unarchive Asset');
    expect(button).toBeInTheDocument();
  });

  it('handles successful archiving', async () => {
    (archiveProductAction as any).mockResolvedValue({ success: true });

    render(
      <ArchiveProductButton productId="p-1" productName="Test Product" isArchived={false} />
    );

    // Click the main action button
    fireEvent.click(screen.getByTitle('Archive Asset'));

    // Wait for the confirmation modal to appear and click confirm
    const confirmButton = screen.getByText('Yes, Archive');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(archiveProductAction).toHaveBeenCalledWith('p-1', true);
      expect(toast.success).toHaveBeenCalledWith('Produk berhasil diarsipkan');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('handles successful unarchiving', async () => {
    (archiveProductAction as any).mockResolvedValue({ success: true });

    render(
      <ArchiveProductButton productId="p-1" productName="Test Product" isArchived={true} />
    );

    // Click the main action button
    fireEvent.click(screen.getByTitle('Unarchive Asset'));

    // Wait for the confirmation modal to appear and click confirm
    const confirmButton = screen.getByText('Yes, Restore');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(archiveProductAction).toHaveBeenCalledWith('p-1', false);
      expect(toast.success).toHaveBeenCalledWith('Produk berhasil dipulihkan');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('handles missing success field from action', async () => {
    (archiveProductAction as any).mockResolvedValue({ success: false, error: 'Custom error from server' });

    render(
      <ArchiveProductButton productId="p-1" productName="Test Product" isArchived={false} />
    );

    fireEvent.click(screen.getByTitle('Archive Asset'));

    const confirmButton = screen.getByText('Yes, Archive');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Custom error from server');
    });
  });

  it('handles network error thrown during action execution', async () => {
    const errorMsg = 'Network request failed';
    (archiveProductAction as any).mockRejectedValue(new Error(errorMsg));

    render(
      <ArchiveProductButton productId="p-1" productName="Test Product" isArchived={false} />
    );

    fireEvent.click(screen.getByTitle('Archive Asset'));

    const confirmButton = screen.getByText('Yes, Archive');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMsg);
    });
  });
});
