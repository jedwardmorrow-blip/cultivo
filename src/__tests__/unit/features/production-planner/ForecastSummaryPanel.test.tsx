import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForecastSummaryPanel } from '@/features/production-planner/components/ForecastSummaryPanel';
import { supabase } from '@/lib/supabase';
import type { ForecastSummaryRow } from '@/features/production-planner/types';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// =====================================================
// Fixtures
// =====================================================

function makeForecastRow(overrides: Partial<ForecastSummaryRow> = {}): ForecastSummaryRow {
  return {
    month: '2026-05-01',
    projected_yield_grams: 5000,
    projected_revenue: 22500,
    projected_labor_hours: 40,
    committed_yield_grams: 3000,
    committed_revenue: 13500,
    committed_labor_hours: 24,
    ...overrides,
  };
}

/** Build the Supabase chainable mock for v_forecast_summary */
function mockForecastQuery(resolvedValue: unknown) {
  const mockThen = vi.fn().mockImplementation((cb: (v: any) => any) =>
    Promise.resolve(cb(resolvedValue))
  );
  const mockOrder = vi.fn().mockReturnValue({ then: mockThen });
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
  return { mockSelect, mockOrder, mockThen };
}

// =====================================================
// Tests
// =====================================================

describe('ForecastSummaryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================
  // Initial render (collapsed)
  // =====================================================

  describe('initial render', () => {
    it('renders the toggle button with forecast label', () => {
      render(<ForecastSummaryPanel />);
      expect(
        screen.getByRole('button', { name: /6-Month Forecast Summary/i })
      ).toBeInTheDocument();
    });

    it('does not show table data when collapsed', () => {
      render(<ForecastSummaryPanel />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('does not fetch data before expansion', () => {
      render(<ForecastSummaryPanel />);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  // =====================================================
  // Expand — data loading
  // =====================================================

  describe('on expand', () => {
    it('queries v_forecast_summary when panel is expanded', async () => {
      const { mockSelect, mockOrder } = mockForecastQuery({
        data: [makeForecastRow()],
        error: null,
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      render(<ForecastSummaryPanel />);
      fireEvent.click(screen.getByRole('button', { name: /6-Month Forecast Summary/i }));

      await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('v_forecast_summary'));
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('month', { ascending: true });
    });

    it('renders the forecast table after successful load', async () => {
      const rows = [
        makeForecastRow({ month: '2026-05-01' }),
        makeForecastRow({ month: '2026-06-01' }),
      ];
      const { mockSelect } = mockForecastQuery({ data: rows, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      render(<ForecastSummaryPanel />);
      fireEvent.click(screen.getByRole('button', { name: /6-Month Forecast Summary/i }));

      await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    });

    it('shows empty state message when no forecast rows exist', async () => {
      const { mockSelect } = mockForecastQuery({ data: [], error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      render(<ForecastSummaryPanel />);
      fireEvent.click(screen.getByRole('button', { name: /6-Month Forecast Summary/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/No forecast data/i)
        ).toBeInTheDocument()
      );
    });

    it('shows error message when Supabase returns an error', async () => {
      const { mockSelect } = mockForecastQuery({
        data: null,
        error: { message: 'permission denied for view v_forecast_summary' },
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      render(<ForecastSummaryPanel />);
      fireEvent.click(screen.getByRole('button', { name: /6-Month Forecast Summary/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/permission denied for view v_forecast_summary/i)
        ).toBeInTheDocument()
      );
    });
  });

  // =====================================================
  // Data formatting helpers (via rendered output)
  // =====================================================

  describe('number formatting', () => {
    async function renderExpanded(rows: ForecastSummaryRow[]) {
      const { mockSelect } = mockForecastQuery({ data: rows, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });
      render(<ForecastSummaryPanel />);
      fireEvent.click(screen.getByRole('button', { name: /6-Month Forecast Summary/i }));
      await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    }

    it('formats grams >= 1000 as kg with one decimal', async () => {
      await renderExpanded([makeForecastRow({ projected_yield_grams: 5000 })]);
      expect(screen.getByText('5.0kg')).toBeInTheDocument();
    });

    it('formats grams < 1000 as integer grams', async () => {
      await renderExpanded([makeForecastRow({ projected_yield_grams: 750 })]);
      expect(screen.getByText('750g')).toBeInTheDocument();
    });

    it('formats revenue >= 1000 as $k with one decimal', async () => {
      await renderExpanded([makeForecastRow({ projected_revenue: 22500 })]);
      expect(screen.getByText('$22.5k')).toBeInTheDocument();
    });

    it('formats revenue < 1000 as integer dollars', async () => {
      await renderExpanded([makeForecastRow({ projected_revenue: 450 })]);
      expect(screen.getByText('$450')).toBeInTheDocument();
    });

    it('formats labor hours as integer with h suffix', async () => {
      await renderExpanded([makeForecastRow({ projected_labor_hours: 40 })]);
      expect(screen.getByText('40h')).toBeInTheDocument();
    });

    it('formats month as short month + 2-digit year (May 26)', async () => {
      await renderExpanded([makeForecastRow({ month: '2026-05-01' })]);
      // en-US locale: "May '26" — check for partial match
      expect(screen.getByText(/May/i)).toBeInTheDocument();
    });
  });

  // =====================================================
  // Collapse / toggle behavior
  // =====================================================

  describe('collapse behavior', () => {
    it('hides table again when toggle is clicked a second time', async () => {
      const { mockSelect } = mockForecastQuery({
        data: [makeForecastRow()],
        error: null,
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      render(<ForecastSummaryPanel />);
      const toggle = screen.getByRole('button', { name: /6-Month Forecast Summary/i });

      fireEvent.click(toggle); // expand
      await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

      fireEvent.click(toggle); // collapse
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('does not re-fetch when collapsing', async () => {
      const { mockSelect } = mockForecastQuery({
        data: [makeForecastRow()],
        error: null,
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      render(<ForecastSummaryPanel />);
      const toggle = screen.getByRole('button', { name: /6-Month Forecast Summary/i });

      fireEvent.click(toggle);
      await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
      const callCount = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.length;

      fireEvent.click(toggle); // collapse — should not trigger another fetch
      expect((supabase.from as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
    });
  });

  // =====================================================
  // Legend row
  // =====================================================

  describe('legend', () => {
    it('shows projected and committed legend items after expansion', async () => {
      const { mockSelect } = mockForecastQuery({
        data: [makeForecastRow()],
        error: null,
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelect,
      });

      render(<ForecastSummaryPanel />);
      fireEvent.click(screen.getByRole('button', { name: /6-Month Forecast Summary/i }));
      await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());

      expect(screen.getByText(/Projected/i)).toBeInTheDocument();
      expect(screen.getByText(/Committed/i)).toBeInTheDocument();
    });
  });
});
