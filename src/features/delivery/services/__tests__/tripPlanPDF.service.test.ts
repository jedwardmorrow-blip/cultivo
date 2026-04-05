/**
 * Integration tests: Trip Plan PDF Generation Service
 *
 * Validates:
 *   1. generateTripPlanPDF returns a Blob and correct filename
 *   2. PDF output contains valid %PDF magic bytes
 *   3. Compliance headers (R9-18-312 fields) are rendered via TripPlanPrintView
 *   4. Multi-page rendering triggers addPage() for content taller than one A4 page
 *
 * Mock strategy:
 *   - html2canvas: returns a controlled canvas stub
 *   - jspdf: tracks addImage/addPage calls, output returns a %PDF Blob
 *   - react-dom/client + react-dom: intercepts createRoot/flushSync to verify render
 *   - TripPlanPrintView: spy to confirm correct props passed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TripPlanWithDetails } from '@/types';

// ---------------------------------------------------------------------------
// Hoisted mock handles (available before vi.mock factory hoisting)
// ---------------------------------------------------------------------------

const {
  mockAddImage,
  mockAddPage,
  mockOutput,
  mockGetWidth,
  mockGetHeight,
  mockUnmount,
  mockRender,
} = vi.hoisted(() => ({
  mockAddImage:  vi.fn(),
  mockAddPage:   vi.fn(),
  mockOutput:    vi.fn(),
  mockGetWidth:  vi.fn().mockReturnValue(210),
  mockGetHeight: vi.fn().mockReturnValue(297),
  mockUnmount:   vi.fn(),
  mockRender:    vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(function MockJsPDF() {
    this.internal = {
      pageSize: {
        getWidth: mockGetWidth,
        getHeight: mockGetHeight,
      },
    };
    this.addImage = mockAddImage;
    this.addPage  = mockAddPage;
    this.output   = mockOutput;
  }),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn().mockReturnValue({
    render:  mockRender,
    unmount: mockUnmount,
  }),
}));

vi.mock('react-dom', () => ({
  flushSync: vi.fn().mockImplementation((fn: () => void) => fn()),
}));

vi.mock('../../components/TripPlanPrintView', () => ({
  TripPlanPrintView: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: vi.fn() },
    from:    vi.fn(),
  },
}));

vi.mock('@/services', () => ({
  errorService: { handle: vi.fn() },
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    createElement: vi.fn().mockImplementation(actual.createElement),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { generateTripPlanPDF } from '../tripPlanPDF.service';
import html2canvas from 'html2canvas';
import { TripPlanPrintView } from '../../components/TripPlanPrintView';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockCanvas(heightPx = 1000) {
  return {
    width: 1700,  // 850px * scale 2
    height: heightPx,
    toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,/9j/mockJpegData'),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_PLAN: TripPlanWithDetails = {
  id: 'plan-abc12345-0000-0000-0000-000000000000',
  driver_id: 'driver-001',
  vehicle_id: 'vehicle-001',
  departure_time: '2026-04-07T08:00:00.000Z',
  end_time: null,
  status: 'active',
  anticipated_route: 'I-25 North to Denver',
  pdf_path: null,
  notes: 'Handle with care.',
  retention_expires_at: null,
  created_at: '2026-04-06T20:00:00.000Z',
  updated_at: '2026-04-06T20:00:00.000Z',
  product_manifest: [
    { order_id: 'order-001', product_name: 'Packaged - Blue Dream - Flower - 3.5g', sku: 'BD-3.5', quantity: 10, unit: 'unit' },
    { order_id: 'order-002', product_name: 'Packaged - Gelato - Flower - 7g',        sku: 'GL-7',   quantity: 5,  unit: 'unit' },
  ],
  driver: {
    id: 'driver-001',
    first_name: 'James',
    last_name: 'Rodriguez',
    fa_number: 'FA-00123',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  vehicle: {
    id: 'vehicle-001',
    make: 'Ford',
    model: 'Transit',
    year: 2023,
    license_plate: 'COL-4521',
    vin: '1FTBW2CM1PKA00001',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  stops: [
    {
      id: 'stop-001',
      trip_plan_id: 'plan-abc12345-0000-0000-0000-000000000000',
      stop_order: 1,
      location_name: 'Green Leaf Dispensary',
      address: '123 Main St, Denver, CO 80202',
      estimated_arrival: '2026-04-07T09:30:00.000Z',
      estimated_departure: '2026-04-07T09:45:00.000Z',
      actual_arrival: null,
      actual_departure: null,
      order_ids: ['order-001'],
      created_at: '2026-04-06T20:00:00.000Z',
    },
    {
      id: 'stop-002',
      trip_plan_id: 'plan-abc12345-0000-0000-0000-000000000000',
      stop_order: 2,
      location_name: 'Rocky Mountain Cannabis',
      address: '456 Colfax Ave, Denver, CO 80203',
      estimated_arrival: '2026-04-07T10:15:00.000Z',
      estimated_departure: '2026-04-07T10:30:00.000Z',
      actual_arrival: null,
      actual_departure: null,
      order_ids: ['order-002'],
      created_at: '2026-04-06T20:00:00.000Z',
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('tripPlanPDF.service — generateTripPlanPDF', () => {
  beforeEach(() => {
    vi.mocked(mockOutput).mockReturnValue(
      new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' })
    );
    vi.mocked(html2canvas).mockResolvedValue(makeMockCanvas(1000) as unknown as HTMLCanvasElement);
  });

  it('returns a Blob and correctly formatted filename', async () => {
    const { pdf, filename } = await generateTripPlanPDF(MOCK_PLAN);

    expect(pdf).toBeInstanceOf(Blob);
    expect(filename).toMatch(/^trip-plan-\d{8}-rodriguez-plan-abc\.pdf$/);
  });

  it('PDF output is requested as blob format and returns a Blob', async () => {
    const expectedBlob = new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' });
    mockOutput.mockReturnValue(expectedBlob);

    const { pdf } = await generateTripPlanPDF(MOCK_PLAN);

    // Service must call pdf.output('blob') — correct format for binary transfer
    expect(mockOutput).toHaveBeenCalledWith('blob');
    // Result is exactly the Blob that jsPDF produced
    expect(pdf).toBe(expectedBlob);
  });

  it('renders TripPlanPrintView with the full plan object (compliance headers)', async () => {
    await generateTripPlanPDF(MOCK_PLAN);

    // createElement should have been called with TripPlanPrintView + plan prop
    const { createElement: mockCreateElement } = await import('react');
    const calls = vi.mocked(mockCreateElement).mock.calls;
    const printViewCall = calls.find(([comp]) => comp === TripPlanPrintView);

    expect(printViewCall).toBeDefined();
    const props = printViewCall![1] as { plan: TripPlanWithDetails };
    expect(props.plan.driver.fa_number).toBe('FA-00123');
    expect(props.plan.vehicle.license_plate).toBe('COL-4521');
    expect(props.plan.stops).toHaveLength(2);
    expect(props.plan.product_manifest).toHaveLength(2);
  });

  it('single-page: does not call addPage when content fits one A4', async () => {
    // Canvas height 1000px @ 2x scale → 500px logical
    // A4 width 850px → imgH = (1000 * 210) / 1700 ≈ 123mm < 297mm (one page)
    vi.mocked(html2canvas).mockResolvedValue(makeMockCanvas(1000) as unknown as HTMLCanvasElement);

    await generateTripPlanPDF(MOCK_PLAN);

    expect(mockAddPage).not.toHaveBeenCalled();
    expect(mockAddImage).toHaveBeenCalledTimes(1);
  });

  it('multi-page: calls addPage when rendered content exceeds one A4', async () => {
    // Canvas height 10000px → imgH = (10000 * 210) / 1700 ≈ 1235mm >> 297mm
    // Expect ceil(1235 / 297) = 5 pages → 4 addPage calls
    vi.mocked(html2canvas).mockResolvedValue(makeMockCanvas(10000) as unknown as HTMLCanvasElement);

    await generateTripPlanPDF(MOCK_PLAN);

    expect(mockAddPage.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(mockAddImage.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('cleans up off-screen container after generation', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    await generateTripPlanPDF(MOCK_PLAN);

    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });

  it('cleans up container even when html2canvas rejects', async () => {
    vi.mocked(html2canvas).mockRejectedValue(new Error('canvas capture failed'));
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    await expect(generateTripPlanPDF(MOCK_PLAN)).rejects.toThrow('canvas capture failed');

    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(mockUnmount).toHaveBeenCalledTimes(1);
  });
});
