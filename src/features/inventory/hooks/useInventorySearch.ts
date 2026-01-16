import { useState, useCallback } from 'react';
import type { SearchResult } from '../types';
import { searchInventory } from '../services/inventory.service';

/**
 * useInventorySearch
 *
 * Provides search functionality across inventory items.
 * Searches by package ID, strain, batch, room, and other criteria.
 *
 * @returns {Object} Search state and functions
 *
 * @example
 * const { searchTerm, setSearchTerm, searchResults, searching, handleSearch, clearSearch } = useInventorySearch();
 */

export function useInventorySearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (term: string) => {
    if (!term || term.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const searchQuery = term.trim().toLowerCase();

      // Search inventory items by multiple criteria
      const { data } = await searchInventory(searchQuery);

      // Map results to search result format
      const results: SearchResult[] = (data || []).map((item) => {
        let match_reason = '';
        if (item.package_id?.toLowerCase().includes(searchQuery)) {
          match_reason = 'Package ID';
        } else if (item.strain?.toLowerCase().includes(searchQuery)) {
          match_reason = 'Strain';
        } else if (item.batch?.toLowerCase().includes(searchQuery)) {
          match_reason = 'Batch';
        } else if (item.product_name?.toLowerCase().includes(searchQuery)) {
          match_reason = 'Product Name';
        } else if (item.sku?.toLowerCase().includes(searchQuery)) {
          match_reason = 'SKU';
        }

        return {
          package_id: item.package_id || item.id || 'Unknown',
          stage_display_name: item.category || 'Unknown',
          match_reason,
          strain: item.strain || 'Unknown',
          batch: item.batch,
          room: item.room,
          weight_or_units: parseFloat(item.available_qty?.toString() || '0'),
          unit: item.unit || 'units',
          status: item.status,
        };
      });

      setSearchResults(results);
    } catch (err) {
      console.error('Error searching inventory:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    searching,
    handleSearch,
    clearSearch,
  };
}
