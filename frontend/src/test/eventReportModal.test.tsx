// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventReportModal } from '../components/admin/EventReportModal';
import { seismicApi } from '../api/seismicApi';

vi.mock('../api/seismicApi', () => ({
  seismicApi: {
    getSensorConfig: vi.fn(),
    getWaveformBefore: vi.fn(),
  },
}));

const row = {
  event_unique_id: 'evt-1',
  path: '../uploadedeventMax/evt-1.log',
  status: 'uploaded',
  intensity: 6,
  timestamp: 947261843930,
};

describe('EventReportModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(seismicApi.getSensorConfig).mockResolvedValue({
      success: true,
      data: { warning: 5, warrant: 7, xthold: 0.2, ythold: 0.2, zthold: 0.2 },
    } as any);
  });

  it('degrades gracefully when the event log file cannot be read', async () => {
    vi.mocked(seismicApi.getWaveformBefore).mockResolvedValue({
      success: false,
      message: 'Could not read event log',
      data: null,
    } as any);

    render(<EventReportModal row={row} onClose={() => {}} />);

    expect(
      await screen.findByText(/Waveform data unavailable/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download PDF/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Download CSV/i })).toBeEnabled();
  });

  it('fetches and displays the event log waveform, flagging the breaching axis', async () => {
    vi.mocked(seismicApi.getWaveformBefore).mockResolvedValue({
      success: true,
      data: {
        pgaX: 0.5,
        pgaY: 0.1,
        pgaZ: 0.05,
        intensity: 6,
        content: [
          [1, 100, 0.1, 0.05, 0.02, 4],
          [1, 150, 0.5, 0.1, 0.05, 6],
        ],
      },
    } as any);

    render(<EventReportModal row={row} onClose={() => {}} />);

    // The "before" endpoint appends ".log" itself, so the ".log" suffix
    // already present on row.path must be stripped before calling it.
    expect(seismicApi.getWaveformBefore).toHaveBeenCalledWith('evt-1', '../uploadedeventMax/evt-1');
    expect(await screen.findByText(/PGA & PEIS determination/i)).toBeInTheDocument();
    expect(screen.getByText(/Event triggered by X-axis/i)).toBeInTheDocument();
    expect(screen.queryByText(/Waveform data unavailable/i)).not.toBeInTheDocument();
  });
});
