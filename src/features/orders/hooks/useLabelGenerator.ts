import { useReducer, useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ordersDataService } from '@/features/orders/services/ordersService';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { logoService } from '@/features/settings/services';
import { notificationService } from '@/services/notification.service';
import { DEFAULT_LICENSE_NUMBER } from '@/lib/constants';

export interface Label {
  id: string;
  label_number: string;
  product_name: string;
  strain: string;
  product_type: string;
  net_weight_grams: number;
  unit_count: number;
  qr_code_data: string;
  thc_percentage: number;
  cbd_percentage: number;
  package_id: string;
  batch_id: string;
  test_date: string;
  package_date: string;
  harvest_date: string;
  printed_at: string;
  compliance_uid: string;
  warnings: string[];
  lineage: string;
  upc_code?: string;
  barcode_url?: string;
  barcode_format?: string;
  expiration_date?: string;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  strain: string;
}

export interface LabelFormData {
  product_id: string;
  batch_id: string;
  package_id: string;
  net_weight_grams: number;
  unit_count: number;
  thc_percentage: number;
  cbd_percentage: number;
  test_date: string;
  package_date: string;
  harvest_date: string;
  lineage: string;
  product_category: string;
  compliance_uid: string;
  quantity_to_generate: number;
  upc_code: string;
}

export interface FormState {
  formData: LabelFormData;
  packageIdPreview: string[];
  packageIdWarning: string;
  showNewLabelForm: boolean;
  showPreview: boolean;
  selectedLabel: Label | null;
}

export const initialFormData: LabelFormData = {
  product_id: '',
  batch_id: '',
  package_id: '',
  net_weight_grams: 3.5,
  unit_count: 1,
  thc_percentage: 0,
  cbd_percentage: 0,
  test_date: '',
  package_date: new Date().toISOString().split('T')[0],
  harvest_date: '',
  lineage: '',
  product_category: 'Indica Hybrid',
  compliance_uid: '',
  quantity_to_generate: 1,
  upc_code: ''
};

export const initialFormState: FormState = {
  formData: initialFormData,
  packageIdPreview: [],
  packageIdWarning: '',
  showNewLabelForm: false,
  showPreview: false,
  selectedLabel: null,
};

export type FormAction =
  | { type: 'SET_FIELD'; field: keyof LabelFormData; value: any }
  | { type: 'SET_PACKAGE_WARNING'; warning: string; previewIds: string[] }
  | { type: 'SHOW_NEW_FORM' }
  | { type: 'CLOSE_NEW_FORM' }
  | { type: 'SHOW_PREVIEW'; label: Label }
  | { type: 'CLOSE_PREVIEW' }
  | { type: 'RESET_FORM' };

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, formData: { ...state.formData, [action.field]: action.value } };
    case 'SET_PACKAGE_WARNING':
      return { ...state, packageIdWarning: action.warning, packageIdPreview: action.previewIds };
    case 'SHOW_NEW_FORM':
      return { ...state, showNewLabelForm: true };
    case 'CLOSE_NEW_FORM':
      return { ...state, showNewLabelForm: false };
    case 'SHOW_PREVIEW':
      return { ...state, showPreview: true, selectedLabel: action.label };
    case 'CLOSE_PREVIEW':
      return { ...state, showPreview: false, selectedLabel: null };
    case 'RESET_FORM':
      return { ...initialFormState, showNewLabelForm: false, showPreview: state.showPreview, selectedLabel: state.selectedLabel };
    default:
      return state;
  }
}

export interface PreviewState {
  qrCodeUrl: string;
  barcodeUrl: string;
  upcBarcodeUrl: string;
  logoDataUrl: string;
  imagesLoaded: boolean;
  loadingPrint: boolean;
  imageError: string | null;
}

export const initialPreviewState: PreviewState = {
  qrCodeUrl: '',
  barcodeUrl: '',
  upcBarcodeUrl: '',
  logoDataUrl: '',
  imagesLoaded: false,
  loadingPrint: false,
  imageError: null,
};

export type PreviewAction =
  | { type: 'START_LOADING' }
  | { type: 'SET_IMAGES'; qr: string; barcode: string; upc: string; logo: string }
  | { type: 'FAILED'; error: string }
  | { type: 'SET_PRINTING'; isPrinting: boolean }
  | { type: 'RESET' };

export function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, imagesLoaded: false, imageError: null, qrCodeUrl: '', barcodeUrl: '', upcBarcodeUrl: '', logoDataUrl: '' };
    case 'SET_IMAGES':
      return {
        ...state,
        qrCodeUrl: action.qr,
        barcodeUrl: action.barcode,
        upcBarcodeUrl: action.upc,
        logoDataUrl: action.logo,
        imagesLoaded: true,
      };
    case 'FAILED':
      return { ...state, imagesLoaded: true, imageError: action.error };
    case 'SET_PRINTING':
      return { ...state, loadingPrint: action.isPrinting };
    case 'RESET':
      return initialPreviewState;
    default:
      return state;
  }
}

async function generateQRCodeRaw(data: string): Promise<string> {
  return typeof QRCode !== 'undefined' ? await QRCode.toDataURL(data, { width: 200, margin: 0, color: { dark: '#000000', light: '#FFFFFF' } }) : '';
}

function generateBarcodeRaw(data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, data, { format: 'CODE128', width: 2, height: 45, displayValue: true, margin: 0, font: 'Arial', fontSize: 8, textMargin: 1 });
      resolve(canvas.toDataURL());
    } catch (e) {
      reject(e);
    }
  });
}

function generateUPCBarcodeRaw(upcCode: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      if (!upcCode || upcCode.length < 8) return resolve('');
      const canvas = document.createElement('canvas');
      const format = upcCode.length === 12 ? 'UPC' : upcCode.length === 8 ? 'EAN8' : 'CODE128';
      JsBarcode(canvas, upcCode, { format, width: 2, height: 28, displayValue: true, fontSize: 7, margin: 0, textMargin: 1 });
      resolve(canvas.toDataURL());
    } catch (e) {
      resolve('');
    }
  });
}

export function generateUPCFromProduct(label: Label): string {
  if (!label.strain) return '';
  const strainCode = label.strain.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  const weightCode = Math.floor(label.net_weight_grams * 10).toString().padStart(3, '0');
  const typeCode = label.product_type?.includes('Indica') ? '1' : label.product_type?.includes('Sativa') ? '2' : '3';
  const randomPart = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `0${typeCode}${strainCode.substring(0, 2)}${weightCode}${randomPart}`.substring(0, 12);
}

export function useLabelGenerator() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [formState, dispatchForm] = useReducer(formReducer, initialFormState);
  const [previewState, dispatchPreview] = useReducer(previewReducer, initialPreviewState);

  const loadLabels = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('labels').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setLabels(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('products').select('id, name, type, strain').eq('is_archived', false).order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadLabels();
    loadProducts();
  }, [loadLabels, loadProducts]);

  useEffect(() => {
    const { package_id, quantity_to_generate } = formState.formData;
    if (!package_id || quantity_to_generate < 1) {
      dispatchForm({ type: 'SET_PACKAGE_WARNING', warning: '', previewIds: [] });
      return;
    }

    const checkDuplicates = async () => {
      const previewIds = Array.from({ length: quantity_to_generate }, (_, i) => `${package_id}${String(i + 1).padStart(3, '0')}`);
      const { data } = await supabase.from('labels').select('package_id').in('package_id', previewIds);
      if (data && data.length > 0) {
        dispatchForm({ type: 'SET_PACKAGE_WARNING', warning: `Warning: The following package IDs already exist: ${data.map(l => l.package_id).join(', ')}`, previewIds });
      } else {
        dispatchForm({ type: 'SET_PACKAGE_WARNING', warning: '', previewIds });
      }
    };
    checkDuplicates();
  }, [formState.formData.package_id, formState.formData.quantity_to_generate]);

  useEffect(() => {
    const { selectedLabel, showPreview } = formState;

    if (!showPreview || !selectedLabel) {
      dispatchPreview({ type: 'RESET' });
      return;
    }

    let isAborted = false; // The core Race Condition Fix
    dispatchPreview({ type: 'START_LOADING' });

    const fetchImages = async () => {
      try {
        const upcCode = selectedLabel.upc_code || generateUPCFromProduct(selectedLabel);
        
        let logoUrl = '';
        try {
          const lUrl = await logoService.getLogoUrl('label');
          if (lUrl) {
            logoUrl = await new Promise<string>((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve('');
                const sW = img.width, sH = img.height;
                const cropTop = sH * 0.25, cropBottom = sH * 0.25, cH = sH - cropTop - cropBottom;
                canvas.width = sW; canvas.height = cH;
                ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, cropTop, sW, cH, 0, 0, sW, cH);
                resolve(canvas.toDataURL('image/png'));
              };
              img.onerror = () => resolve('');
              img.src = lUrl;
            });
          }
        } catch (e) {
          console.error(e);
        }

        const [qr, barcode, upc] = await Promise.all([
          generateQRCodeRaw(selectedLabel.qr_code_data),
          generateBarcodeRaw(selectedLabel.package_id),
          generateUPCBarcodeRaw(upcCode)
        ]);
        
        if (isAborted) return; // Prevent overwriting stale label clicks
        
        setTimeout(() => {
          if (!isAborted) {
            dispatchPreview({ type: 'SET_IMAGES', qr, barcode, upc, logo: logoUrl });
          }
        }, 800);

      } catch (err: any) {
        if (!isAborted) {
          dispatchPreview({ type: 'FAILED', error: err.message || 'Failed to generate barcodes' });
        }
      }
    };

    fetchImages();

    return () => {
      isAborted = true; // Cleanup drops promises
    };
  }, [formState.selectedLabel, formState.showPreview]);

  useEffect(() => {
    if (!formState.showPreview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatchForm({ type: 'CLOSE_PREVIEW' });
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formState.showPreview]);

  const generateLabels = async () => {
    try {
      const { formData, packageIdWarning } = formState;
      const product = products.find(p => p.id === formData.product_id);
      if (!product) { notificationService.warning('Please select a product'); return; }
      if (!formData.package_id) { notificationService.warning('Please enter a package ID prefix'); return; }

      if (packageIdWarning) {
        const confirmed = confirm(`${packageIdWarning}\n\nDo you want to proceed anyway?`);
        if (!confirmed) return;
      }

      const labelsToCreate = [];
      for (let i = 0; i < formData.quantity_to_generate; i++) {
        const packageId = `${formData.package_id}${String(i + 1).padStart(3, '0')}`;
        labelsToCreate.push({
          label_number: `LBL-${Date.now()}-${i}`,
          product_id: formData.product_id,
          package_id: packageId,
          batch_id: formData.batch_id,
          strain: product.strain,
          product_name: product.name,
          product_type: formData.product_category,
          net_weight_grams: formData.net_weight_grams,
          unit_count: formData.unit_count,
          qr_code_data: `${formData.batch_id}-${packageId}`,
          thc_percentage: formData.thc_percentage,
          cbd_percentage: formData.cbd_percentage,
          test_date: formData.test_date || null,
          package_date: formData.package_date,
          harvest_date: formData.harvest_date || null,
          expiration_date: null,
          compliance_uid: formData.compliance_uid || DEFAULT_LICENSE_NUMBER,
          lineage: formData.lineage || '',
          upc_code: formData.upc_code || null,
          barcode_format: formData.upc_code ? (formData.upc_code.length === 12 ? 'UPC' : 'CODE128') : 'CODE128',
          warnings: ['For medical use only', 'Keep out of reach of children', 'May cause drowsiness', 'Do not operate heavy machinery']
        });
      }

      await ordersDataService.createLabels(labelsToCreate);

      dispatchForm({ type: 'RESET_FORM' });
      await loadLabels();
    } catch (error) {
      console.error(error);
      notificationService.error('Failed to generate labels.');
    }
  };

  const markAsPrinted = async (labelId: string) => {
    try {
      await ordersDataService.markLabelPrinted(labelId, new Date().toISOString());
      await loadLabels();
    } catch (err) {
      console.error(err);
    }
  };

  return {
    labels,
    products,
    loading,
    formState,
    previewState,
    dispatchForm,
    dispatchPreview,
    generateLabels,
    markAsPrinted
  };
}
