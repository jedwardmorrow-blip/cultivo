import { useState, useEffect } from 'react';
import { fetchOrderableProducts } from '../services/products.service';
import type { OrderableProduct } from '../types';

export function useOrderableProducts() {
  const [products, setProducts] = useState<OrderableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrderableProducts();
      setProducts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load products';
      setError(message);
      console.error('Error loading orderable products:', err);
    } finally {
      setLoading(false);
    }
  }

  function refreshProducts() {
    return loadProducts();
  }

  return {
    products,
    loading,
    error,
    refreshProducts,
  };
}
