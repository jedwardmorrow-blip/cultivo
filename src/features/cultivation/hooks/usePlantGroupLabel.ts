import { useState, useCallback } from 'react';
import { logoService } from '@/features/settings/services';
import { cultivationService } from '../services';
import type { PlantGroup, IndividualPlant } from '../types';

export type PlantLabelMode = 'group' | 'individual';

export interface PlantGroupLabelData {
  mode: 'group';
  batchNumber: string;
  strainName: string;
  strainAbbreviation: string;
  growthStage: string;
  plantCount: number;
  roomCode: string;
  tableNumber: string | null;
  sectionLabel: string | null;
  plantedDate: string | null;
}

export interface IndividualPlantLabelData {
  mode: 'individual';
  plants: IndividualPlant[];
  batchNumber: string;
  strainName: string;
  strainAbbreviation: string;
  growthStage: string;
  roomCode: string;
}

export type PlantLabelData = PlantGroupLabelData | IndividualPlantLabelData;

export function usePlantGroupLabel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [labelData, setLabelData] = useState<PlantLabelData | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadLogo(): Promise<string> {
    try {
      const logoUrl = await logoService.getLogoUrl('label');
      if (!logoUrl) return '';
      return await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(''); return; }
          const cropTop = img.height * 0.25;
          const cropBottom = img.height * 0.25;
          const croppedHeight = img.height - cropTop - cropBottom;
          canvas.width = img.width;
          canvas.height = croppedHeight;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, cropTop, img.width, croppedHeight, 0, 0, img.width, croppedHeight);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = logoUrl;
      });
    } catch {
      return '';
    }
  }

  const openGroupLabel = useCallback(async (group: PlantGroup) => {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    try {
      const logo = await loadLogo();
      setLogoDataUrl(logo);
      setLabelData({
        mode: 'group',
        batchNumber: group.batch_registry?.batch_number ?? '—',
        strainName: group.strains?.name ?? 'Unknown',
        strainAbbreviation: group.strains?.abbreviation ?? '???',
        growthStage: group.growth_stage,
        plantCount: group.plant_count,
        roomCode: group.grow_rooms?.room_code ?? '—',
        tableNumber: group.room_tables?.table_number != null ? String(group.room_tables.table_number) : null,
        sectionLabel: group.room_sections?.section_label ?? null,
        plantedDate: group.planted_date,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate label');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openPlantLabels = useCallback(async (group: PlantGroup) => {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    try {
      const [logo, plants] = await Promise.all([
        loadLogo(),
        cultivationService.listIndividualPlants(group.id),
      ]);
      setLogoDataUrl(logo);
      const activePlants = plants.filter((p) => p.is_active);
      if (activePlants.length === 0) {
        setError('No active plant IDs registered for this group.');
        setIsLoading(false);
        return;
      }
      setLabelData({
        mode: 'individual',
        plants: activePlants,
        batchNumber: group.batch_registry?.batch_number ?? '—',
        strainName: group.strains?.name ?? 'Unknown',
        strainAbbreviation: group.strains?.abbreviation ?? '???',
        growthStage: group.growth_stage,
        roomCode: group.grow_rooms?.room_code ?? '—',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plant IDs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openSinglePlantLabel = useCallback(async (plant: IndividualPlant, group: PlantGroup) => {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    try {
      const logo = await loadLogo();
      setLogoDataUrl(logo);
      setLabelData({
        mode: 'individual',
        plants: [plant],
        batchNumber: group.batch_registry?.batch_number ?? '—',
        strainName: group.strains?.name ?? 'Unknown',
        strainAbbreviation: group.strains?.abbreviation ?? '???',
        growthStage: group.growth_stage,
        roomCode: group.grow_rooms?.room_code ?? '—',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate label');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openSelectedPlantLabels = useCallback(async (plants: IndividualPlant[], group: PlantGroup) => {
    if (plants.length === 0) return;
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    try {
      const logo = await loadLogo();
      setLogoDataUrl(logo);
      setLabelData({
        mode: 'individual',
        plants,
        batchNumber: group.batch_registry?.batch_number ?? '—',
        strainName: group.strains?.name ?? 'Unknown',
        strainAbbreviation: group.strains?.abbreviation ?? '???',
        growthStage: group.growth_stage,
        roomCode: group.grow_rooms?.room_code ?? '—',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate labels');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const printLabels = useCallback(async (printRef: HTMLDivElement | null): Promise<boolean> => {
    if (!labelData || !printRef) return false;
    try {
      setIsPrinting(true);
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;';
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe document');

      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Print Plant Labels</title>
<style>
@page { size: 1.5in 2in; margin: 0; }
* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
html, body { margin: 0; padding: 0; width: 1.5in; height: 2in; font-family: Arial, sans-serif; }
</style>
</head>
<body>
${printRef.innerHTML}
</body>
</html>`);
      iframeDoc.close();

      await new Promise(resolve => setTimeout(resolve, 500));
      const images = iframeDoc.getElementsByTagName('img');
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise((resolve) => {
            const t = setTimeout(() => resolve(null), 3000);
            img.onload = () => { clearTimeout(t); resolve(null); };
            img.onerror = () => { clearTimeout(t); resolve(null); };
          });
        })
      );
      await new Promise(resolve => setTimeout(resolve, 500));
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
      setIsPrinting(false);
      return true;
    } catch (err) {
      setIsPrinting(false);
      setError(err instanceof Error ? err.message : 'Failed to print');
      return false;
    }
  }, [labelData]);

  const closeLabel = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    setIsPrinting(false);
    setLabelData(null);
    setLogoDataUrl('');
    setError(null);
  }, []);

  return {
    isOpen,
    isLoading,
    isPrinting,
    labelData,
    logoDataUrl,
    error,
    openGroupLabel,
    openPlantLabels,
    openSinglePlantLabel,
    openSelectedPlantLabels,
    printLabels,
    closeLabel,
  };
}
