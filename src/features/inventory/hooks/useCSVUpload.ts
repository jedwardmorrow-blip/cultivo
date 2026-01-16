import { useState, useCallback } from 'react';
import { notificationService } from '@/services/notification.service';
import { createInventorySnapshot, bulkInsertInventoryItems } from '../services/inventory.service';

/**
 * useCSVUpload
 *
 * Handles CSV file upload and processing for inventory imports.
 * Parses CSV data and imports into inventory_items table.
 *
 * @param {Function} onComplete - Callback function to execute after successful upload
 * @returns {Object} Upload state and handler function
 *
 * @example
 * const { uploading, handleFileUpload } = useCSVUpload(() => fetchInventory());
 */

export function useCSVUpload(onComplete?: () => void) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setUploading(true);

        // Read file content
        const text = await file.text();
        const lines = text.split('\n').filter((line) => line.trim());

        if (lines.length < 2) {
          throw new Error('CSV file must contain headers and at least one data row');
        }

        // Parse CSV headers
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

        // Parse CSV data rows
        const rows = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        // Create inventory snapshot record
        const { data: snapshot } = await createInventorySnapshot({
          import_date: new Date().toISOString(),
          row_count: rows.length,
          source: 'csv_upload',
          notes: `Imported from ${file.name}`,
        });

        if (!snapshot) throw new Error('Failed to create snapshot');

        // Map CSV rows to inventory items
        const inventoryItems = rows.map((row) => ({
          package_id: row['package_id'] || row['id'] || `PKG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          product_name: row['product_name'] || row['product'] || 'Unknown',
          strain: row['strain'] || 'Unknown',
          batch: row['batch'] || row['batch_id'],
          category: row['category'] || row['type'] || 'Unknown',
          available_qty: parseFloat(row['available_qty'] || row['quantity'] || '0'),
          reserved_qty: parseFloat(row['reserved_qty'] || '0'),
          unit: row['unit'] || 'units',
          sku: row['sku'],
          room: row['room'],
          status: row['status'] || 'active',
          snapshot_id: snapshot.id,
        }));

        // Insert inventory items in batches
        const batchSize = 100;
        for (let i = 0; i < inventoryItems.length; i += batchSize) {
          const batch = inventoryItems.slice(i, i + batchSize);
          await bulkInsertInventoryItems(batch);
        }

        notificationService.success(
          `Successfully imported ${rows.length} inventory items from ${file.name}`
        );

        if (onComplete) {
          onComplete();
        }
      } catch (err) {
        console.error('Error uploading CSV:', err);
        notificationService.error(
          `Failed to upload CSV: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      } finally {
        setUploading(false);
        // Reset file input
        event.target.value = '';
      }
    },
    [onComplete]
  );

  return {
    uploading,
    handleFileUpload,
  };
}
