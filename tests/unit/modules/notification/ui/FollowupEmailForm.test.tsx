import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FollowupEmailForm } from '@/modules/notification/ui/FollowupEmailForm';
import { sendFollowupEmailAction } from '@/modules/notification/actions/notification.actions';

// Mock the action
vi.mock('@/modules/notification/actions/notification.actions', () => ({
  sendFollowupEmailAction: vi.fn(),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Mail: () => <div data-testid="mail-icon" />,
  Send: () => <div data-testid="send-icon" />,
}));

describe('FollowupEmailForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form correctly with default empty fields', () => {
    render(<FollowupEmailForm />);

    expect(screen.getByLabelText(/Email Tujuan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Tujuan/i)).toHaveValue('');

    expect(screen.getByLabelText(/Subjek/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subjek/i)).toHaveValue('');

    expect(screen.getByLabelText(/Pesan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pesan/i)).toHaveValue('');

    expect(screen.getByRole('button', { name: /Kirim Email/i })).toBeInTheDocument();
  });

  it('allows user to type in fields', async () => {
    const user = userEvent.setup();
    render(<FollowupEmailForm />);

    const emailInput = screen.getByLabelText(/Email Tujuan/i);
    const subjectInput = screen.getByLabelText(/Subjek/i);
    const messageInput = screen.getByLabelText(/Pesan/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(subjectInput, 'Test Subject');
    await user.type(messageInput, 'Test Message Content');

    expect(emailInput).toHaveValue('test@example.com');
    expect(subjectInput).toHaveValue('Test Subject');
    expect(messageInput).toHaveValue('Test Message Content');
  });

  it('handles successful form submission', async () => {
    const mockedAction = vi.mocked(sendFollowupEmailAction);
    mockedAction.mockResolvedValueOnce({ success: true, id: '123' });

    const user = userEvent.setup();
    render(<FollowupEmailForm />);

    await user.type(screen.getByLabelText(/Email Tujuan/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Subjek/i), 'Test Subject');
    await user.type(screen.getByLabelText(/Pesan/i), 'Test Message Content');

    const submitButton = screen.getByRole('button', { name: /Kirim Email/i });

    // We use fireEvent here because userEvent waits for microtasks
    // and might miss the loading state assertion.
    fireEvent.click(submitButton);

    expect(screen.getByRole('button', { name: /Mengirim.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mengirim.../i })).toBeDisabled();

    await waitFor(() => {
      expect(mockedAction).toHaveBeenCalledWith(
        'test@example.com',
        'Test Subject',
        'Test Message Content'
      );
    });

    expect(await screen.findByText('Email berhasil dikirim (ID: 123)')).toBeInTheDocument();

    // After it completes, the button should go back to "Kirim Email" and be enabled
    expect(screen.getByRole('button', { name: /Kirim Email/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kirim Email/i })).not.toBeDisabled();
  });

  it('handles failed form submission with error message', async () => {
    const mockedAction = vi.mocked(sendFollowupEmailAction);
    mockedAction.mockResolvedValueOnce({ success: false, error: 'Custom error message' });

    const user = userEvent.setup();
    render(<FollowupEmailForm />);

    await user.type(screen.getByLabelText(/Email Tujuan/i), 'fail@example.com');
    await user.type(screen.getByLabelText(/Subjek/i), 'Fail Subject');
    await user.type(screen.getByLabelText(/Pesan/i), 'Fail Message Content');

    const submitButton = screen.getByRole('button', { name: /Kirim Email/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedAction).toHaveBeenCalledWith(
        'fail@example.com',
        'Fail Subject',
        'Fail Message Content'
      );
    });

    expect(await screen.findByText('Custom error message')).toBeInTheDocument();
  });

  it('handles failed form submission with default fallback error', async () => {
    const mockedAction = vi.mocked(sendFollowupEmailAction);
    mockedAction.mockResolvedValueOnce({ success: false });

    const user = userEvent.setup();
    render(<FollowupEmailForm />);

    await user.type(screen.getByLabelText(/Email Tujuan/i), 'fail2@example.com');
    await user.type(screen.getByLabelText(/Subjek/i), 'Fail2 Subject');
    await user.type(screen.getByLabelText(/Pesan/i), 'Fail2 Message Content');

    const submitButton = screen.getByRole('button', { name: /Kirim Email/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedAction).toHaveBeenCalledWith(
        'fail2@example.com',
        'Fail2 Subject',
        'Fail2 Message Content'
      );
    });

    expect(await screen.findByText('Gagal')).toBeInTheDocument();
  });
});
