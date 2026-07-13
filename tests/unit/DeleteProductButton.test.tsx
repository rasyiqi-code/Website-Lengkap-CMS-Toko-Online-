// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteProductButton } from '@/modules/catalog/ui/shop/DeleteProductButton';
import { deleteProductAction } from '@/modules/catalog/actions/product.actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}));

vi.mock('@/modules/catalog/actions/product.actions', () => ({
    deleteProductAction: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

const mockAlert = vi.fn();
global.alert = mockAlert;
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock the confirmation modal to render it immediately, or we can actually click through it since it's just state
// Let's not mock it so we can test the real interaction.
// We might need to mock icons if they are problematic.
vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual as any,
        Trash2: () => React.createElement('div', { 'data-testid': 'trash-icon' }),
        Loader2: () => React.createElement('div', { 'data-testid': 'loader-icon' }),
    };
});

describe('DeleteProductButton', () => {
    const mockRefresh = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            refresh: mockRefresh,
        });
        document.body.innerHTML = '';
    });

    it('successfully deletes a product', async () => {
        (deleteProductAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

        render(<DeleteProductButton productId="prod-1" productName="Test Product" />);

        // Find the button (it has a title "Hapus Permanen")
        const button = screen.getByTitle('Hapus Permanen');
        fireEvent.click(button);

        // Wait for confirmation modal to appear
        const confirmButton = await screen.findByRole('button', { name: 'Ya, Hapus' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(deleteProductAction).toHaveBeenCalledWith('prod-1');
            expect(toast.success).toHaveBeenCalledWith('Produk berhasil dihapus');
            expect(mockRefresh).toHaveBeenCalled();
        });
    });

    it('shows alert when API returns failure', async () => {
        (deleteProductAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            success: false,
            error: 'Database error'
        });

        render(<DeleteProductButton productId="prod-2" productName="Another Product" />);

        const button = screen.getByTitle('Hapus Permanen');
        fireEvent.click(button);

        const confirmButton = await screen.findByRole('button', { name: 'Ya, Hapus' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(deleteProductAction).toHaveBeenCalledWith('prod-2');
            expect(mockAlert).toHaveBeenCalledWith('Database error');
            expect(mockConsoleError).toHaveBeenCalled();
            expect(toast.success).not.toHaveBeenCalled();
            expect(mockRefresh).not.toHaveBeenCalled();
        });
    });

    it('shows default alert when API returns failure without specific error', async () => {
        (deleteProductAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            success: false,
        });

        render(<DeleteProductButton productId="prod-3" productName="Yet Another Product" />);

        const button = screen.getByTitle('Hapus Permanen');
        fireEvent.click(button);

        const confirmButton = await screen.findByRole('button', { name: 'Ya, Hapus' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(deleteProductAction).toHaveBeenCalledWith('prod-3');
            expect(mockAlert).toHaveBeenCalledWith('Gagal menghapus produk');
        });
    });

    it('shows alert when exception is thrown', async () => {
        const error = new Error('Network failure');
        (deleteProductAction as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        render(<DeleteProductButton productId="prod-4" productName="Bad Product" />);

        const button = screen.getByTitle('Hapus Permanen');
        fireEvent.click(button);

        const confirmButton = await screen.findByRole('button', { name: 'Ya, Hapus' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(deleteProductAction).toHaveBeenCalledWith('prod-4');
            expect(mockAlert).toHaveBeenCalledWith('Network failure');
            expect(mockConsoleError).toHaveBeenCalledWith(error);
        });
    });
});
