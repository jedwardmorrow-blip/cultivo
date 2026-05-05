import { useRef, useEffect } from 'react';
import { X, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components';
import JsBarcode from 'jsbarcode';
import type { PlantLabelData } from '../hooks/usePlantGroupLabel';

const STAGE_COLOR: Record<string, string> = {
  clone: '#38bdf8',
  veg: '#4ade80',
  flower: '#fb7185',
  harvested: '#fbbf24',
};

function formatDateShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

function BarcodeImg({ value, id, width = 1.4, height = 28 }: { value: string; id: string; width?: number; height?: number }) {
  useEffect(() => {
    try {
      JsBarcode(`#${id}`, value, {
        format: 'CODE128',
        width,
        height,
        displayValue: false,
        margin: 0,
      });
    } catch {
      // barcode generation failed
    }
  }, [value, id, width, height]);
  return <svg id={id} />;
}

interface GroupLabelProps {
  logoDataUrl: string;
  batchNumber: string;
  strainName: string;
  strainAbbreviation: string;
  growthStage: string;
  plantCount: number;
  roomCode: string;
  tableNumber: string | null;
  sectionLabel: string | null;
  plantedDate: string | null;
  scale?: number;
  labelIndex?: number;
}

function GroupLabelCard({
  logoDataUrl,
  batchNumber,
  strainName,
  strainAbbreviation,
  growthStage,
  plantCount,
  roomCode,
  tableNumber,
  sectionLabel,
  plantedDate,
  scale = 1,
  labelIndex = 0,
}: GroupLabelProps) {
  const stageColor = STAGE_COLOR[growthStage] ?? '#9ca3af';
  const barcodeId = `barcode-group-${labelIndex}-${scale > 1 ? 'preview' : 'print'}`;
  const locationParts = [roomCode, tableNumber ? `T${tableNumber}` : null, sectionLabel].filter(Boolean);
  const location = locationParts.join(' / ');

  return (
    <div
      style={{
        width: `${1.5 * scale}in`,
        height: `${2 * scale}in`,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        padding: `${0.07 * scale}in`,
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        pageBreakAfter: 'always',
        overflow: 'hidden',
      }}
    >
      {logoDataUrl ? (
        <div style={{ height: `${0.25 * scale}in`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: `${0.04 * scale}in` }}>
          <img src={logoDataUrl} alt="Logo" style={{ maxHeight: `${0.25 * scale}in`, maxWidth: '100%', objectFit: 'contain' }} />
        </div>
      ) : (
        <div style={{ height: `${0.25 * scale}in`, marginBottom: `${0.04 * scale}in` }} />
      )}

      <div style={{ borderTop: `${1.5 * scale}px solid #e5e7eb`, paddingTop: `${0.04 * scale}in`, flex: 1, display: 'flex', flexDirection: 'column', gap: `${0.03 * scale}in` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: `${8.5 * scale}px`, fontWeight: 'bold', color: '#111', letterSpacing: '0.03em', fontFamily: 'monospace' }}>
            {batchNumber}
          </span>
          <span style={{ fontSize: `${7 * scale}px`, fontWeight: 'bold', color: stageColor, textTransform: 'uppercase', letterSpacing: '0.08em', border: `${scale}px solid ${stageColor}`, padding: `0 ${2 * scale}px` }}>
            {growthStage}
          </span>
        </div>

        <div>
          <span style={{ fontSize: `${9 * scale}px`, fontWeight: 'bold', color: '#111', display: 'block', lineHeight: 1.2 }}>
            {strainName}
          </span>
          <span style={{ fontSize: `${7.5 * scale}px`, color: '#6b7280', fontFamily: 'monospace' }}>
            [{strainAbbreviation}]
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: `${1.5 * scale}px` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: `${6.5 * scale}px`, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plants</span>
            <span style={{ fontSize: `${7 * scale}px`, fontWeight: 'bold', color: '#374151' }}>{plantCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: `${6.5 * scale}px`, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location</span>
            <span style={{ fontSize: `${7 * scale}px`, fontWeight: 'bold', color: '#374151' }}>{location || '—'}</span>
          </div>
          {plantedDate && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: `${6.5 * scale}px`, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Planted</span>
              <span style={{ fontSize: `${7 * scale}px`, color: '#374151' }}>{formatDateShort(plantedDate)}</span>
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <BarcodeImg value={batchNumber !== '—' ? batchNumber : 'UNKNOWN'} id={barcodeId} />
          <span style={{ fontSize: `${6 * scale}px`, color: '#6b7280', fontFamily: 'monospace', marginTop: `${1.5 * scale}px` }}>
            {batchNumber}
          </span>
        </div>
      </div>
    </div>
  );
}

interface IndividualLabelCardProps {
  logoDataUrl: string;
  statePlantId: string;
  batchNumber: string;
  strainName: string;
  strainAbbreviation: string;
  growthStage: string;
  roomCode: string;
  scale?: number;
  labelIndex?: number;
}

function IndividualLabelCard({
  logoDataUrl,
  statePlantId,
  batchNumber,
  strainName,
  strainAbbreviation,
  growthStage,
  roomCode,
  scale = 1,
  labelIndex = 0,
}: IndividualLabelCardProps) {
  const barcodeId = `barcode-plant-${labelIndex}-${scale > 1 ? 'preview' : 'print'}`;

  return (
    <div
      style={{
        width: `${2 * scale}in`,
        height: `${1.5 * scale}in`,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        padding: `${0.06 * scale}in`,
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        pageBreakAfter: 'always',
        overflow: 'hidden',
      }}
    >
      {/* Row 1: Logo left, strain abbreviation right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: `${0.02 * scale}in` }}>
        {logoDataUrl ? (
          <img src={logoDataUrl} alt="Logo" style={{ height: `${0.18 * scale}in`, objectFit: 'contain' }} />
        ) : (
          <div style={{ height: `${0.18 * scale}in` }} />
        )}
        <span style={{ fontSize: `${7 * scale}px`, fontWeight: 'bold', color: '#6b7280', fontFamily: 'monospace' }}>
          [{strainAbbreviation}]
        </span>
      </div>

      {/* Divider */}
      <div style={{ borderTop: `${1.5 * scale}px solid #e5e7eb`, marginBottom: `${0.02 * scale}in` }} />

      {/* Row 2: Strain + batch */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: `${0.02 * scale}in` }}>
        <span style={{ fontSize: `${12 * scale}px`, fontWeight: 'bold', color: '#111', lineHeight: 1.1 }}>
          {strainName}
        </span>
        <span style={{ fontSize: `${8.5 * scale}px`, fontWeight: 'bold', color: '#374151', fontFamily: 'monospace', marginLeft: `${4 * scale}px`, flexShrink: 0 }}>
          {batchNumber}
        </span>
      </div>

      {/* Row 3: Barcode + Plant ID (fills remaining space) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <BarcodeImg value={statePlantId} id={barcodeId} width={1.8 * scale} height={36 * scale} />
        <span style={{ fontSize: `${9.5 * scale}px`, fontWeight: 'bold', color: '#111', fontFamily: 'monospace', marginTop: `${1.5 * scale}px`, letterSpacing: '0.05em' }}>
          {statePlantId}
        </span>
        <span style={{ fontSize: `${5 * scale}px`, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: `${0.5 * scale}px` }}>
          Plant ID
        </span>
      </div>
    </div>
  );
}

interface PlantGroupLabelPrintModalProps {
  isOpen: boolean;
  isLoading: boolean;
  isPrinting: boolean;
  labelData: PlantLabelData | null;
  logoDataUrl: string;
  error: string | null;
  onClose: () => void;
  onPrint: (ref: HTMLDivElement | null) => void;
}

export function PlantGroupLabelPrintModal({
  isOpen,
  isLoading,
  isPrinting,
  labelData,
  logoDataUrl,
  error,
  onClose,
  onPrint,
}: PlantGroupLabelPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const isGroup = labelData?.mode === 'group';
  const isIndividual = labelData?.mode === 'individual';
  const individualCount = isIndividual ? (labelData as import('../hooks/usePlantGroupLabel').IndividualPlantLabelData).plants.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-cult-surface border border-cult-border w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-border flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-cult-text-primary uppercase tracking-wider">
              {isGroup ? 'Group Label' : `Plant Labels (${individualCount})`}
            </h3>
            {isIndividual && (
              <p className="text-xs text-cult-border mt-0.5">One label per active plant ID</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-cult-border hover:text-cult-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-6 h-6 text-cult-text-muted animate-spin" />
              <span className="text-xs text-cult-border">Generating preview...</span>
            </div>
          )}

          {error && (
            <div className="bg-cult-danger-muted border border-cult-danger text-cult-danger text-xs p-3">
              {error}
            </div>
          )}

          {!isLoading && !error && labelData && (
            <div className="flex flex-col items-center gap-4">
              {isGroup && labelData.mode === 'group' && (
                <div className="ring-1 ring-cult-border">
                  <GroupLabelCard
                    logoDataUrl={logoDataUrl}
                    batchNumber={labelData.batchNumber}
                    strainName={labelData.strainName}
                    strainAbbreviation={labelData.strainAbbreviation}
                    growthStage={labelData.growthStage}
                    plantCount={labelData.plantCount}
                    roomCode={labelData.roomCode}
                    tableNumber={labelData.tableNumber}
                    sectionLabel={labelData.sectionLabel}
                    plantedDate={labelData.plantedDate}
                    scale={3}
                    labelIndex={0}
                  />
                </div>
              )}

              {isIndividual && labelData.mode === 'individual' && (
                <div className="w-full space-y-3">
                  <p className="text-xs text-cult-border text-center">
                    Preview showing first label · {individualCount} total will print
                  </p>
                  <div className="flex justify-center ring-1 ring-cult-border">
                    <IndividualLabelCard
                      logoDataUrl={logoDataUrl}
                      statePlantId={labelData.plants[0].state_plant_id}
                      batchNumber={labelData.batchNumber}
                      strainName={labelData.strainName}
                      strainAbbreviation={labelData.strainAbbreviation}
                      growthStage={labelData.growthStage}
                      roomCode={labelData.roomCode}
                      scale={2}
                      labelIndex={0}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-cult-border flex-shrink-0 flex gap-3">
          <Button
            onClick={() => onPrint(printRef.current)}
            disabled={isLoading || isPrinting || !!error || !labelData}
            size="sm"
            icon={isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          >
            {isPrinting ? 'Printing...' : 'Print'}
          </Button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold uppercase tracking-wider border border-cult-border text-cult-text-muted hover:border-cult-text-muted hover:text-cult-text-primary transition-all"
          >
            Close
          </button>
        </div>
      </div>

      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {!isLoading && !error && labelData?.mode === 'group' && (
            <GroupLabelCard
              logoDataUrl={logoDataUrl}
              batchNumber={labelData.batchNumber}
              strainName={labelData.strainName}
              strainAbbreviation={labelData.strainAbbreviation}
              growthStage={labelData.growthStage}
              plantCount={labelData.plantCount}
              roomCode={labelData.roomCode}
              tableNumber={labelData.tableNumber}
              sectionLabel={labelData.sectionLabel}
              plantedDate={labelData.plantedDate}
              scale={1}
              labelIndex={0}
            />
          )}
          {!isLoading && !error && labelData?.mode === 'individual' &&
            labelData.plants.map((plant, idx) => (
              <IndividualLabelCard
                key={plant.id}
                logoDataUrl={logoDataUrl}
                statePlantId={plant.state_plant_id}
                batchNumber={labelData.batchNumber}
                strainName={labelData.strainName}
                strainAbbreviation={labelData.strainAbbreviation}
                growthStage={labelData.growthStage}
                roomCode={labelData.roomCode}
                scale={1}
                labelIndex={idx}
              />
            ))
          }
        </div>
      </div>
    </div>
  );
}
