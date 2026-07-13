// @vitest-environment jsdom


import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { ArchiveProductButton } from '@/modules/catalog/ui/shop/ArchiveProductButton';
import { archiveProductAction } from '@/modules/catalog/actions/product.actions';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// Extend expect with jest-dom matchers explicitly since we're overriding global setup
expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock the dependencies
vi.mock('@/modules/catalog/actions/product.actions', () => ({
  archiveProductAction: vi.fn(),
}));

// Provide useRouter mock locally
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock Portal to render directly so we don't have to wait for useEffect
vi.mock('@/modules/shared/ui/ui/Portal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('ArchiveProductButton', () => {
  const mockProps = {
    productId: 'prod-123',
    productName: 'Test Product',
    isArchived: false,
  };

  const mockRouter = {
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    // Mock window.alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders correctly when product is not archived', () => {
    render(<ArchiveProductButton {...mockProps} />);
    expect(screen.getByRole('button', { name: /Archive Asset/i })).toBeInTheDocument();
  });

  it('renders correctly when product is archived', () => {
    render(<ArchiveProductButton {...mockProps} isArchived={true} />);
    expect(screen.getByRole('button', { name: /Unarchive Asset/i })).toBeInTheDocument();
  });

  it('opens confirmation modal when clicked', async () => {
    render(<ArchiveProductButton {...mockProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Archive Asset/i }));
    });

    expect(screen.getByText(/Archive Asset\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Move "Test Product" to long-term storage/i)).toBeInTheDocument();
  });

  it('calls archive action and handles success correctly', async () => {
    (archiveProductAction as any).mockResolvedValueOnce({ success: true });

    render(<ArchiveProductButton {...mockProps} />);

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Archive Asset/i }));
    });

    // Confirm
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Yes, Archive/i }));
    });

    await waitFor(() => {
      expect(archiveProductAction).toHaveBeenCalledWith('prod-123', true);
      expect(toast.success).toHaveBeenCalledWith('Produk berhasil diarsipkan');
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it('calls unarchive action and handles success correctly', async () => {
    (archiveProductAction as any).mockResolvedValueOnce({ success: true });

    render(<ArchiveProductButton {...mockProps} isArchived={true} />);

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Unarchive Asset/i }));
    });

    // Confirm
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Yes, Restore/i }));
    });

    await waitFor(() => {
      expect(archiveProductAction).toHaveBeenCalledWith('prod-123', false);
      expect(toast.success).toHaveBeenCalledWith('Produk berhasil dipulihkan');
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it('handles API error correctly', async () => {
    const errorMessage = 'Something went wrong';
    (archiveProductAction as any).mockResolvedValueOnce({ success: false, error: errorMessage });

    render(<ArchiveProductButton {...mockProps} />);

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Archive Asset/i }));
    });

    // Confirm
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Yes, Archive/i }));
    });

    await waitFor(() => {
      expect(archiveProductAction).toHaveBeenCalledWith('prod-123', true);
      expect(window.alert).toHaveBeenCalledWith(errorMessage);
      expect(console.error).toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });
  });

  it('handles API error without error message correctly', async () => {
    (archiveProductAction as any).mockResolvedValueOnce({ success: false }); // No error message provided

    render(<ArchiveProductButton {...mockProps} />);

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Archive Asset/i }));
    });

    // Confirm
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Yes, Archive/i }));
    });

    await waitFor(() => {
      expect(archiveProductAction).toHaveBeenCalledWith('prod-123', true);
      expect(window.alert).toHaveBeenCalledWith("Gagal mengubah status produk");
      expect(console.error).toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });
  });

  it('handles general error/exception correctly', async () => {
    const errorMessage = 'Network error';
    (archiveProductAction as any).mockRejectedValueOnce(new Error(errorMessage));

    render(<ArchiveProductButton {...mockProps} />);

    // Open modal
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Archive Asset/i }));
    });

    // Confirm
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Yes, Archive/i }));
    });

    await waitFor(() => {
      expect(archiveProductAction).toHaveBeenCalledWith('prod-123', true);
      expect(window.alert).toHaveBeenCalledWith(errorMessage);
      expect(console.error).toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });
  });
});
