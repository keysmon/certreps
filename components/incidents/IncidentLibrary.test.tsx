import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { IncidentLibrary } from './IncidentLibrary';
import { listIncidents } from '@/lib/incidents';
import { newIncidentRun } from '@/lib/incident-progress';
import { useSession } from '@/lib/supabase/useSession';
import { readIncidentRuns, pullIncidentProgress, flushIncidentRun, incidentNeedsSync, writeIncidentRun } from '@/lib/incident-store';

vi.mock('@/lib/supabase/useSession', () => ({ useSession: vi.fn() }));
vi.mock('@/lib/incident-store', () => ({
  readIncidentRuns: vi.fn(() => []), pullIncidentProgress: vi.fn().mockResolvedValue([]),
  flushIncidentRun: vi.fn().mockResolvedValue(undefined), incidentNeedsSync: vi.fn(() => false), writeIncidentRun: vi.fn(),
}));
const incidents = listIncidents().slice(0, 2);
const guest = { session: null, available: false, loading: false, error: null };
const account = (id: string) => ({ ...guest, available: true, session: { user: { id } } as Session });
function card(index = 0) { return screen.getByRole('heading', { name: incidents[index].title }).closest('article')!; }
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSession).mockReturnValue(guest);
  vi.mocked(readIncidentRuns).mockReturnValue([]);
  vi.mocked(pullIncidentProgress).mockResolvedValue([]);
  vi.mocked(flushIncidentRun).mockResolvedValue(undefined as never);
  vi.mocked(incidentNeedsSync).mockReturnValue(false);
});

describe('IncidentLibrary', () => {
  it('shows untouched cases without creating runs or contacting cloud for guests', () => {
    render(<IncidentLibrary incidents={incidents} />);
    expect(screen.getAllByRole('link', { name: 'Start case' })).toHaveLength(2);
    expect(readIncidentRuns).toHaveBeenCalledWith('guest');
    expect(pullIncidentProgress).not.toHaveBeenCalled();
    expect(writeIncidentRun).not.toHaveBeenCalled();
  });

  it('counts checked answers, including feedback at the current checkpoint, and labels completed debriefs', () => {
    const partial = { ...newIncidentRun(incidents[0]), answers: { '0': 2 }, cursor: 0 };
    const complete = { ...newIncidentRun(incidents[1]), answers: { '0': 0, '1': 1, '2': 2 }, cursor: 3 };
    vi.mocked(readIncidentRuns).mockReturnValue([partial, complete]);
    render(<IncidentLibrary incidents={incidents} />);
    expect(within(card()).getByRole('link', { name: 'Resume case' })).toBeInTheDocument();
    expect(within(card()).getByText('1 of 3 checkpoints checked')).toBeInTheDocument();
    expect(within(card(1)).getByRole('link', { name: 'View debrief' })).toBeInTheDocument();
    expect(within(card(1)).getByText('3 of 3 checkpoints checked')).toBeInTheDocument();
  });

  it('explains old-version progress without silently treating it as current', () => {
    vi.mocked(readIncidentRuns).mockReturnValue([{ ...newIncidentRun(incidents[0]), contentVersion: 'older-content' }]);
    render(<IncidentLibrary incidents={incidents} />);
    expect(within(card()).getByText(/case updated.*open it to reset/i)).toBeInTheDocument();
    expect(within(card()).getByRole('link', { name: 'Review updated case' })).toBeInTheDocument();
    expect(writeIncidentRun).not.toHaveBeenCalled();
  });

  it('waits for account lookup and isolates account progress from guest and previous owners', async () => {
    vi.mocked(useSession).mockReturnValue({ ...account('u1'), loading: true });
    vi.mocked(readIncidentRuns).mockImplementation(scope => scope === 'u1' ? [{ ...newIncidentRun(incidents[0]), draft: 1 }] : []);
    const view = render(<IncidentLibrary incidents={incidents} />);
    expect(readIncidentRuns).not.toHaveBeenCalled();
    expect(pullIncidentProgress).not.toHaveBeenCalled();
    vi.mocked(useSession).mockReturnValue(account('u1'));
    view.rerender(<IncidentLibrary incidents={incidents} />);
    expect(within(card()).getByRole('link', { name: 'Resume case' })).toBeInTheDocument();
    await waitFor(() => expect(pullIncidentProgress).toHaveBeenCalledWith('u1'));
    vi.mocked(useSession).mockReturnValue(account('u2'));
    view.rerender(<IncidentLibrary incidents={incidents} />);
    expect(within(card()).getByRole('link', { name: 'Start case' })).toBeInTheDocument();
    expect(readIncidentRuns).not.toHaveBeenCalledWith('guest');
  });

  it('pulls then flushes dirty cases and refreshes on focus, online and local storage events', async () => {
    vi.mocked(useSession).mockReturnValue(account('u1'));
    const run = newIncidentRun(incidents[0]);
    vi.mocked(readIncidentRuns).mockReturnValue([run]);
    vi.mocked(incidentNeedsSync).mockReturnValue(true);
    render(<IncidentLibrary incidents={incidents} />);
    await waitFor(() => expect(flushIncidentRun).toHaveBeenCalledWith('u1', run.incidentId));
    expect(vi.mocked(pullIncidentProgress).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(flushIncidentRun).mock.invocationCallOrder[0]);
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(pullIncidentProgress).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(flushIncidentRun).toHaveBeenCalledTimes(2));
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(pullIncidentProgress).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(flushIncidentRun).toHaveBeenCalledTimes(3));
    vi.mocked(readIncidentRuns).mockReturnValue([]);
    fireEvent(window, new Event('storage'));
    expect(within(card()).getByRole('link', { name: 'Start case' })).toBeInTheDocument();
  });

  it('does not read guest cases when the account lookup fails', () => {
    vi.mocked(useSession).mockReturnValue({ ...account('u1'), session: null, error: 'Unable to check your account. Please reload.' });
    render(<IncidentLibrary incidents={incidents} />);
    expect(screen.getByRole('status')).toHaveTextContent('Unable to check your account');
    expect(readIncidentRuns).not.toHaveBeenCalled();
    expect(pullIncidentProgress).not.toHaveBeenCalled();
    expect(screen.getAllByRole('link', { name: 'Open case' })).toHaveLength(2);
  });

  it('refreshes same-document guest progress changes without cloud requests', () => {
    render(<IncidentLibrary incidents={incidents} />);
    vi.mocked(readIncidentRuns).mockReturnValue([{ ...newIncidentRun(incidents[0]), draft: 1 }]);
    fireEvent(window, new Event('certreps:incidents-changed'));
    expect(within(card()).getByRole('link', { name: 'Resume case' })).toBeInTheDocument();
    expect(pullIncidentProgress).not.toHaveBeenCalled();
    expect(writeIncidentRun).not.toHaveBeenCalled();
  });

  it('keeps device progress visible when account sync fails', async () => {
    vi.mocked(useSession).mockReturnValue(account('u1'));
    vi.mocked(readIncidentRuns).mockReturnValue([{ ...newIncidentRun(incidents[0]), draft: 2 }]);
    vi.mocked(pullIncidentProgress).mockRejectedValue(new Error('Offline'));
    render(<IncidentLibrary incidents={incidents} />);
    expect(await screen.findByText(/account sync unavailable/i)).toBeInTheDocument();
    expect(within(card()).getByRole('link', { name: 'Resume case' })).toBeInTheDocument();
  });

  it('ignores a late pull after switching accounts', async () => {
    vi.mocked(useSession).mockReturnValue(account('u1'));
    let finish!: () => void;
    vi.mocked(pullIncidentProgress).mockImplementation(scope => scope === 'u1' ? new Promise(resolve => { finish = () => resolve([]); }) : Promise.resolve([]));
    vi.mocked(readIncidentRuns).mockImplementation(scope => scope === 'u1' ? [newIncidentRun(incidents[0])] : []);
    const view = render(<IncidentLibrary incidents={incidents} />);
    vi.mocked(useSession).mockReturnValue(account('u2'));
    view.rerender(<IncidentLibrary incidents={incidents} />);
    finish();
    await waitFor(() => expect(within(card()).getByRole('link', { name: 'Start case' })).toBeInTheDocument());
    expect(flushIncidentRun).not.toHaveBeenCalledWith('u1', expect.anything());
  });
});
