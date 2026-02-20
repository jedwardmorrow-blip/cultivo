import { useRef, useEffect } from 'react';
import { X, Printer, Loader2 } from 'lucide-react';
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

function BarcodeImg({ value, id }: { value: string; id: string }) {
  useEffect(() => {
    try {
      JsBarcode(`#${id}`, value, {
        format: 'CODE128',
        width: 1.4,
        height: 28,
        displayValue: false,
        margin: 0,
      });
    } catch {
      // barcode generation failed
    }
  }, [value, id]);
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
  const stageColor = STAGE_COLOR[growthStage] ?? '#9ca3af';
  const barcodeId = `barcode-plant-${labelIndex}-${scale > 1 ? 'preview' : 'print'}`;

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
        <div style={{ height: `${0.22 * scale}in`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: `${0.04 * scale}in` }}>
          <img src={logoDataUrl} alt="Logo" style={{ maxHeight: `${0.22 * scale}in`, maxWidth: '100%', objectFit: 'contain' }} />
        </div>
      ) : (
        <div style={{ height: `${0.22 * scale}in`, marginBottom: `${0.04 * scale}in` }} />
      )}

      <div style={{ borderTop: `${1.5 * scale}px solid #e5e7eb`, paddingTop: `${0.04 * scale}in`, flex: 1, display: 'flex', flexDirection: 'column', gap: `${0.025 * scale}in` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: `${7.5 * scale}px`, fontWeight: 'bold', color: '#111', fontFamily: 'monospace' }}>
            {batchNumber}
          </span>
          <span style={{ fontSize: `${6.5 * scale}px`, fontWeight: 'bold', color: stageColor, textTransform: 'uppercase', border: `${scale}px solid ${stageColor}`, padding: `0 ${2 * scale}px` }}>
            {growthStage}
          </span>
        </div>

        <div>
          <span style={{ fontSize: `${9.5 * scale}px`, fontWeight: 'bold', color: '#111', display: 'block', lineHeight: 1.2 }}>
            {strainName}
          </span>
          <span style={{ fontSize: `${7 * scale}px`, color: '#6b7280', fontFamily: 'monospace' }}>
            [{strainAbbreviation}] · {roomCode}
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
          <BarcodeImg value={statePlantId} id={barcodeId} />
          <span style={{ fontSize: `${8 * scale}px`, fontWeight: 'bold', color: '#111', fontFamily: 'monospace', marginTop: `${2 * scale}px`, letterSpacing: '0.1em' }}>
            {statePlantId}
          </span>
          <span style={{ fontSize: `${5.5 * scale}px`, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: `${1 * scale}px` }}>
            State Plant ID
          </span>
        </div>
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
      <div className="bg-cult-near-black border border-cult-medium-gray w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-cult-medium-gray flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-cult-white uppercase tracking-wider">
              {isGroup ? 'Group Label' : `Plant Labels (${individualCount})`}
            </h3>
            {isIndividual && (
              <p className="text-xs text-cult-medium-gray mt-0.5">One label per active plant ID</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-cult-medium-gray hover:text-cult-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-6 h-6 text-cult-light-gray animate-spin" />
              <span className="text-xs text-cult-medium-gray">Generating preview...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-950 border border-red-700 text-red-300 text-xs p-3">
              {error}
            </div>
          )}

          {!isLoading && !error && labelData && (
            <div className="flex flex-col items-center gap-4">
              {isGroup && labelData.mode === 'group' && (
                <div className="ring-1 ring-cult-medium-gray">
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
                  <p className="text-xs text-cult-medium-gray text-center">
                    Preview showing first label · {individualCount} total will print
                  </p>
                  <div className="flex justify-center ring-1 ring-cult-medium-gray">
                    <IndividualLabelCard
                      logoDataUrl={logoDataUrl}
                      statePlantId={labelData.plants[0].state_plant_id}
                      batchNumber={labelData.batchNumber}
                      strainName={labelData.strainName}
                      strainAbbreviation={labelData.strainAbbreviation}
                      growthStage={labelData.growthStage}
                      roomCode={labelData.roomCode}
                      scale={3}
                      labelIndex={0}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-cult-medium-gray flex-shrink-0 flex gap-3">
          <button
            onClick={() => onPrint(printRef.current)}
            disabled={isLoading || isPrinting || !!error || !labelData}
            className="flex items-center gap-2 bg-white text-cult-black px-5 py-2 text-sm font-bold uppercase tracking-wider hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPrinting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            {isPrinting ? 'Printing...' : 'Print'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold uppercase tracking-wider border border-cult-medium-gray text-cult-light-gray hover:border-cult-lighter-gray hover:text-cult-white transition-all"
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
