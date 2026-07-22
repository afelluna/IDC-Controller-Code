// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePassword } from '../components/admin/ChangePassword';
import { EventList } from '../components/admin/EventList';
import { ThresholdSettings } from '../components/admin/ThresholdSettings';
import { seismicApi } from '../api/seismicApi';

vi.mock('../api/seismicApi', () => ({
  seismicApi: {
    getSensorConfig: vi.fn(),
    updateThresholds: vi.fn(),
    changePassword: vi.fn(),
    getHistoryMax: vi.fn(),
    getAllHistoryMax: vi.fn(),
  },
}));

const recentRows = [
  { event_unique_id: 'a', path: '../uploadedeventMax/a.log', status: 'uploaded', intensity: 5, timestamp: 947261843930 },
  { event_unique_id: 'b', path: '../uploadedeventMax/b.log', status: 'uploaded', intensity: 6, timestamp: 947261343966 },
  { event_unique_id: 'c', path: '../uploadedeventMax/c.log', status: 'uploaded', intensity: 6, timestamp: 947261343965 },
  { event_unique_id: 'd', path: '../uploadedeventMax/d.log', status: 'uploaded', intensity: 8, timestamp: 947261254546 },
  { event_unique_id: 'e', path: '../uploadedeventMax/e.log', status: 'uploaded', intensity: 8, timestamp: 947261254506 },
  { event_unique_id: 'f', path: '../uploadedeventMax/f.log', status: 'uploaded', intensity: 6, timestamp: 947261203306 },
];

const fullRows = Array.from({ length: 25 }, (_, idx) => ({
  event_unique_id: `full-${idx}`,
  path: `../uploadedeventMax/full-${idx}.log`,
  status: 'uploaded',
  intensity: (idx % 10) + 1,
  timestamp: 1784690000000 - idx * 1000,
}));

describe('admin EventList', () => {
  beforeEach(() => {
    vi.mocked(seismicApi.getHistoryMax).mockResolvedValue({
      success: true,
      data: { history: recentRows },
    } as any);
    vi.mocked(seismicApi.getAllHistoryMax).mockReset();
  });

  it('loads recent history by default and filters by PEIS', async () => {
    render(<EventList />);

    expect(await screen.findByText('6 events')).toBeInTheDocument();
    expect(screen.getByText('Showing recent events only. "Load full history" scans every event ever recorded — can be slow on a unit with a lot of history.')).toBeInTheDocument();

    fireEvent.change(screen.getByTitle('Filter by PEIS level'), { target: { value: '6' } });

    expect(screen.getByText('3 events')).toBeInTheDocument();
    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(3);
    for (const row of bodyRows) {
      expect(within(row).getByText('6')).toBeInTheDocument();
    }
  });

  it('loads full history on demand and paginates it', async () => {
    vi.mocked(seismicApi.getAllHistoryMax).mockResolvedValue({
      success: true,
      data: { history: fullRows },
    } as any);

    render(<EventList />);

    expect(await screen.findByText('6 events')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Load full history/i }));

    expect(await screen.findByText('25 events')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load full history/i })).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(20);
  });

  it('keeps recent rows visible when full history fails', async () => {
    vi.mocked(seismicApi.getAllHistoryMax).mockRejectedValue(new Error('timeout'));

    render(<EventList />);

    expect(await screen.findByText('6 events')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Load full history/i }));

    expect(await screen.findByText('Could not load full history — the device may still be busy scanning older files.')).toBeInTheDocument();
    expect(screen.getByText('6 events')).toBeInTheDocument();
    expect(screen.getByText('../uploadedeventMax/a.log')).toBeInTheDocument();
  });
});

describe('admin ThresholdSettings', () => {
  beforeEach(() => {
    vi.mocked(seismicApi.getSensorConfig).mockResolvedValue({
      success: true,
      data: { warning: 5, warrant: 7, xthold: 0.2, ythold: 0.2, zthold: 0.2 },
    } as any);
    vi.mocked(seismicApi.updateThresholds).mockResolvedValue({ success: true, data: null } as any);
  });

  it('loads current values and submits updated thresholds', async () => {
    render(<ThresholdSettings />);

    const xThreshold = await screen.findByLabelText(/X threshold/i);
    fireEvent.change(xThreshold, { target: { value: '0.201' } });
    fireEvent.click(screen.getByRole('button', { name: /Save thresholds/i }));

    await waitFor(() => {
      expect(seismicApi.updateThresholds).toHaveBeenCalledWith({
        warning: 5,
        warrant: 7,
        xthold: 0.201,
        ythold: 0.2,
        zthold: 0.2,
      });
    });
    expect(await screen.findByText('Thresholds updated.')).toBeInTheDocument();
  });
});

describe('admin ChangePassword', () => {
  beforeEach(() => {
    vi.mocked(seismicApi.changePassword).mockResolvedValue({ success: true, data: null } as any);
  });

  it('blocks mismatched passwords and submits matching passwords', async () => {
    render(<ChangePassword />);

    const newPassword = screen.getByLabelText(/New password/i);
    const confirmPassword = screen.getByLabelText(/Confirm password/i);
    const updateButton = screen.getByRole('button', { name: /Update password/i });

    fireEvent.change(newPassword, { target: { value: 'usher' } });
    fireEvent.change(confirmPassword, { target: { value: 'different' } });
    expect(updateButton).toBeDisabled();

    fireEvent.change(confirmPassword, { target: { value: 'usher' } });
    expect(updateButton).toBeEnabled();
    fireEvent.click(updateButton);

    await waitFor(() => expect(seismicApi.changePassword).toHaveBeenCalledWith('usher'));
    expect(await screen.findByText('Password updated. Use it on your next sign-in.')).toBeInTheDocument();
  });
});
