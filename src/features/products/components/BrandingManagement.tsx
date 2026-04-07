import { useState, useEffect } from 'react';
import { Upload, Trash2, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { logoService, validateImageFile, type LogoVariant, type LogoSettings } from '@/services';

export function BrandingManagement() {
  const [logos, setLogos] = useState<LogoSettings>({
    logo_dark_url: '',
    logo_light_url: '',
    logo_invoice_url: '',
    logo_label_url: '',
    logo_eye_url: '',
    logo_upload_date: ''
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<LogoVariant, boolean>>({
    dark: false,
    light: false,
    invoice: false,
    label: false,
    eye: false
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadLogos();
  }, []);

  async function loadLogos() {
    try {
      const settings = await logoService.getLogoSettings();
      setLogos(settings);
    } catch (error) {
      console.error('Error loading logos:', error);
      setMessage({ type: 'error', text: 'Failed to load logo settings' });
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(variant: LogoVariant, file: File) {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setMessage({ type: 'error', text: validation.error || 'Invalid file' });
      return;
    }

    setUploading(prev => ({ ...prev, [variant]: true }));
    setMessage(null);

    try {
      const result = await logoService.uploadLogo(file, variant);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `${variant.charAt(0).toUpperCase() + variant.slice(1)} logo uploaded successfully!`
        });
        await loadLogos();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Upload failed' });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: error?.message || 'Upload failed' });
    } finally {
      setUploading(prev => ({ ...prev, [variant]: false }));
    }
  }

  async function handleDelete(variant: LogoVariant) {
    const confirmed = window.confirm(`Are you sure you want to delete the ${variant} logo?`);
    if (!confirmed) return;

    setMessage(null);

    try {
      await logoService.deleteLogo(variant);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `${variant.charAt(0).toUpperCase() + variant.slice(1)} logo deleted successfully!`
        });
        await loadLogos();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Delete failed' });
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      setMessage({ type: 'error', text: error?.message || 'Delete failed' });
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent, variant: LogoVariant) {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(variant, files[0]);
    }
  }

  const logoVariants: Array<{ key: LogoVariant; label: string; description: string; urlKey: keyof LogoSettings }> = [
    {
      key: 'dark',
      label: 'Dark Logo',
      description: 'Used on light backgrounds (navigation, light mode)',
      urlKey: 'logo_dark_url'
    },
    {
      key: 'light',
      label: 'Light Logo',
      description: 'Used on dark backgrounds (dark mode)',
      urlKey: 'logo_light_url'
    },
    {
      key: 'invoice',
      label: 'Invoice Logo',
      description: 'Used on printed invoices and documents',
      urlKey: 'logo_invoice_url'
    },
    {
      key: 'label',
      label: 'Label Logo',
      description: 'Used on product labels and packaging',
      urlKey: 'logo_label_url'
    },
    {
      key: 'eye',
      label: 'Eye Graphic',
      description: 'Brand accent graphic and decorative element',
      urlKey: 'logo_eye_url'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cult-lighter-gray">Loading branding settings...</div>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div
          className={`mb-6 p-4 border flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-cult-success-muted border-cult-success'
              : 'bg-cult-danger-muted border-cult-danger'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-cult-success flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-cult-danger flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`${message.type === 'success' ? 'text-cult-text-primary' : 'text-cult-text-primary'}`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      <div className="bg-cult-near-black border border-cult-medium-gray p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-cult-white uppercase tracking-wide mb-2">
            Company Logos
          </h2>
          <p className="text-sm text-cult-light-gray">
            Upload and manage your company logos for different use cases. Recommended format: PNG with transparent background.
            Maximum file size: 5MB.
          </p>
        </div>

        <div className="space-y-6">
          {logoVariants.map((variant) => {
            const currentUrl = logos[variant.urlKey];
            const isUploading = uploading[variant.key];

            return (
              <div
                key={variant.key}
                className="border border-cult-medium-gray p-6 bg-cult-black"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-cult-white uppercase tracking-wide">
                      {variant.label}
                    </h3>
                    <p className="text-sm text-cult-light-gray mt-1">
                      {variant.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor={`file-${variant.key}`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, variant.key)}
                      className={`block border-2 border-dashed border-cult-medium-gray p-8 text-center cursor-pointer transition-all hover:border-cult-white hover:bg-cult-near-black ${
                        isUploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <input
                        id={`file-${variant.key}`}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(variant.key, file);
                        }}
                        disabled={isUploading}
                        className="hidden"
                      />
                      <Upload className="w-8 h-8 text-cult-light-gray mx-auto mb-3" />
                      <p className="text-cult-white text-sm font-medium mb-1">
                        {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-cult-lighter-gray text-xs">
                        PNG, JPG, SVG, WebP up to 5MB
                      </p>
                    </label>
                  </div>

                  <div className="flex flex-col items-center justify-center border border-cult-medium-gray p-4 bg-cult-near-black">
                    {currentUrl ? (
                      <div className="w-full">
                        <div className="mb-3 flex items-center justify-center bg-white p-4 min-h-[120px]">
                          <img
                            src={currentUrl}
                            alt={`${variant.label} preview`}
                            className="max-w-full max-h-32 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleDelete(variant.key)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-cult-danger text-cult-danger hover:bg-cult-danger-muted transition-all text-sm uppercase tracking-wider"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-cult-medium-gray mx-auto mb-2" />
                        <p className="text-cult-lighter-gray text-sm">No logo uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {logos.logo_upload_date && (
          <div className="mt-6 p-4 border border-cult-medium-gray bg-cult-near-black">
            <p className="text-sm text-cult-light-gray">
              <span className="text-cult-white font-medium">Last updated:</span>{' '}
              {new Date(logos.logo_upload_date).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 bg-cult-near-black border border-cult-medium-gray p-6">
        <h3 className="text-lg font-semibold text-cult-white mb-4 uppercase tracking-wide">
          Logo Guidelines
        </h3>
        <div className="space-y-3 text-sm text-cult-light-gray">
          <p>
            <span className="text-cult-white font-medium">Dark Logo:</span> Should have dark colors
            and will be displayed on light backgrounds. Used in the main navigation and light-themed areas.
          </p>
          <p>
            <span className="text-cult-white font-medium">Light Logo:</span> Should have light colors
            or white and will be displayed on dark backgrounds. Used when dark mode is enabled.
          </p>
          <p>
            <span className="text-cult-white font-medium">Invoice Logo:</span> Optimized for printing
            on invoices and documents. Should be high resolution and work well in grayscale.
          </p>
          <p>
            <span className="text-cult-white font-medium">Label Logo:</span> Used on product labels.
            Should be compact and clear at small sizes.
          </p>
          <p>
            <span className="text-cult-white font-medium">Eye Graphic:</span> Brand accent element used
            for decorative purposes and design accents throughout the application.
          </p>
          <p className="pt-3 border-t border-cult-medium-gray">
            <span className="text-cult-white font-medium">Best Practices:</span> Use PNG format with
            transparent backgrounds for flexibility. Ensure logos are at least 300x300 pixels for print quality.
            Keep file sizes under 2MB for optimal loading performance.
          </p>
        </div>
      </div>
    </div>
  );
}
