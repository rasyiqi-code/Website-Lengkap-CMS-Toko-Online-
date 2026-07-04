// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { DeleteProductButton } from '@/modules/catalog/ui/shop/DeleteProductButton';
import { deleteProductAction } from '@/modules/catalog/actions/product.actions';
import toast from 'react-hot-toast';

vi.mock('@/modules/catalog/actions/product.actions', () => ({
    deleteProductAction: vi.fn(),
}));

describe('DeleteProductButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear document body to avoid issues with Portal
        document.body.innerHTML = '';
    });

    afterEach(() => {
        cleanup();
    });

    it('should show error toast when deleteProductAction returns success: false', async () => {
        const errorMessage = 'Delete failed';
        vi.mocked(deleteProductAction).mockResolvedValueOnce({
            success: false,
            error: errorMessage,
        });

        render(
            <DeleteProductButton productId="123" productName="Test Product" />
        );

        // Click the trigger button to open modal
        const triggerButton = screen.getByTitle('Hapus Permanen');
        fireEvent.click(triggerButton);

        // Wait for modal to appear and click confirm
        await waitFor(() => {
            const confirmButton = screen.getByRole('button', { name: /Ya, Hapus/i });
            fireEvent.click(confirmButton);
        });

        await waitFor(() => {
            expect(deleteProductAction).toHaveBeenCalledWith('123');
            expect(toast.error).toHaveBeenCalledWith(errorMessage);
        });
    });

    it('should show error toast when deleteProductAction throws an error', async () => {
        const errorMessage = 'Network error';
        vi.mocked(deleteProductAction).mockRejectedValueOnce(new Error(errorMessage));

        render(
            <DeleteProductButton productId="123" productName="Test Product" />
        );

        // Click the trigger button to open modal
        const triggerButton = screen.getByTitle('Hapus Permanen');
        fireEvent.click(triggerButton);

        // Wait for modal to appear and click confirm
        await waitFor(() => {
            const confirmButton = screen.getByRole('button', { name: /Ya, Hapus/i });
            fireEvent.click(confirmButton);
        });

        await waitFor(() => {
            expect(deleteProductAction).toHaveBeenCalledWith('123');
            expect(toast.error).toHaveBeenCalledWith(errorMessage);
        });
    });

    it('should show error toast with default message when error lacks a message', async () => {
        vi.mocked(deleteProductAction).mockRejectedValueOnce({});

        render(
            <DeleteProductButton productId="123" productName="Test Product" />
        );

        // Click the trigger button to open modal
        const triggerButton = screen.getByTitle('Hapus Permanen');
        fireEvent.click(triggerButton);

        // Wait for modal to appear and click confirm
        await waitFor(() => {
            const confirmButton = screen.getByRole('button', { name: /Ya, Hapus/i });
            fireEvent.click(confirmButton);
        });

        await waitFor(() => {
            expect(deleteProductAction).toHaveBeenCalledWith('123');
            expect(toast.error).toHaveBeenCalledWith("Terjadi kesalahan saat menghapus produk");
        });
    });
});
