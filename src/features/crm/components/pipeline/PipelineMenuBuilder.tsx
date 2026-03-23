import { useState, useMemo, useCallback } from 'react';
import { X, Search, Copy, Printer, Check } from 'lucide-react';
import type { StrainPipelineEntry, GradeCode } from '../../hooks/useSalesPipeline';
import { GRADE_STYLES, formatCurrency } from './pipelineConstants';
import { GradeBadge } from './PipelineBadges';

interface MenuBuilderProps {
  strains: StrainPipelineEntry[];
  onClose: () => void;
}

interface ProductFormat {
  id: string;
  label: string;
  weight: number;
  defaultPrice: number;
}

const PRODUCT_FORMATS: ProductFormat[] = [
  { id: '3.5g', label: '3.5g Flower', weight: 3.5, defaultPrice: 35 },
  { id: '14g', label: '14g Smalls', weight: 14, defaultPrice: 80 },
  { id: '1lb', label: '1lb Flower', weight: 454, defaultPrice: 1800 },
];

interface SelectedItem {
  strain: string;
  grade: GradeCode;
  formats: Record<string, { qty: number; price: number }>;
}

export function PipelineMenuBuilder({ strains, onClose }: MenuBuilderProps) {
  const [copied, setCopied] = useState(false);
  const [pickerGrade, setPickerGrade] = useState<GradeCode | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const availableStrains = useMemo(() => {
    let list = strains;
    if (pickerGrade !== 'all') list = list.filter(s => s.primaryGrade === pickerGrade);
    if (search) list = list.filter(s => s.strain.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [strains, pickerGrade, search]);

  const addStrain = useCallback((s: StrainPipelineEntry) => {
    if (selectedItems.find(i => i.strain === s.strain)) return;
    const formats: Record<string, { qty: number; price: number }> = {};
    PRODUCT_FORMATS.forEach(f => { formats[f.id] = { qty: 0, price: f.defaultPrice }; });
    setSelectedItems(prev => [...prev, { strain: s.strain, grade: s.primaryGrade, formats }]);
  }, [selectedItems]);

  const removeStrain = useCallback((name: string) => {
    setSelectedItems(prev => prev.filter(i => i.strain !== name));
  }, []);

  const updateQty = useCallback((strain: string, formatId: string, qty: string) => {
    setSelectedItems(prev => prev.map(i =>
      i.strain === strain
        ? { ...i, formats: { ...i.formats, [formatId]: { ...i.formats[formatId], qty: Math.max(0, parseInt(qty) || 0) } } }
        : i
    ));
  }, []);

  const updatePrice = useCallback((strain: string, formatId: string, price: string) => {
    setSelectedItems(prev => prev.map(i =>
      i.strain === strain
        ? { ...i, formats: { ...i.formats, [formatId]: { ...i.formats[formatId], price: Math.max(0, parseFloat(price) || 0) } } }
        : i
    ));
  }, []);

  const totals = useMemo(() => {
    let units = 0, revenue = 0;
    selectedItems.forEach(item => {
      Object.values(item.formats).forEach(d => {
        units += d.qty;
        revenue += d.qty * d.price;
      });
    });
    return { units, revenue };
  }, [selectedItems]);

  const activeItems = selectedItems.filter(i => Object.values(i.formats).some(f => f.qty > 0));

  const buildPlainText = useCallback(() => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const lines = [`CULT OPS \u2014 Order Menu`, `Date: ${today}`, ''];
    activeItems.forEach(item => {
      const gs = GRADE_STYLES[item.grade];
      lines.push(`${item.strain} [${gs.label}]`);
      PRODUCT_FORMATS.forEach(f => {
        const d = item.formats[f.id];
        if (d.qty > 0) lines.push(`  ${f.label}: ${d.qty} \u00d7 $${d.price} = $${(d.qty * d.price).toLocaleString()}`);
      });
      lines.push('');
    });
    lines.push(`Total: ${totals.units} units \u2014 $${totals.revenue.toLocaleString()}`);
    return lines.join('\n');
  }, [activeItems, totals]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildPlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Cult Ops Menu</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 700px; margin: 40px auto; color: #1a1a1a; }
        h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
        h2 { font-size: 11px; color: #888; font-weight: 600; letter-spacing: 0.1em; margin-bottom: 24px; }
        .item { margin-bottom: 18px; border-bottom: 1px solid #eee; padding-bottom: 14px; }
        .strain { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
        .line { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
        .total { font-size: 20px; font-weight: 800; margin-top: 20px; padding-top: 16px; border-top: 2px solid #1a1a1a; display: flex; justify-content: space-between; }
      </style></head><body>`);
    w.document.write(`<h1>CULT OPS</h1><h2>ORDER MENU \u00b7 ${today}</h2>`);
    activeItems.forEach(item => {
      w.document.write(`<div class="item"><div class="strain">${item.strain} (${GRADE_STYLES[item.grade].label})</div>`);
      PRODUCT_FORMATS.forEach(f => {
        const d = item.formats[f.id];
        if (d.qty > 0) w.document.write(`<div class="line"><span>${f.label}: ${d.qty} units</span><span>$${(d.qty * d.price).toLocaleString()}</span></div>`);
      });
      w.document.write('</div>');
    });
    w.document.write(`<div class="total"><span>${totals.units} units</span><span>$${totals.revenue.toLocaleString()}</span></div>`);
    w.document.write('</body></html>');
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const gradeOptions: (GradeCode | 'all')[] = ['all', 'CULT', 'B', 'C', 'D', 'UNDEFINED'];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]" onClick={onClose} />

      <div className="fixed z-[1000] flex flex-col rounded-2xl border border-cult-medium-gray/40 overflow-hidden bg-[#0c0c0c] top-[6vh] left-1/2 -translate-x-1/2 w-[95vw] max-w-[1020px]"
        style={{ maxHeight: '88vh' }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-cult-medium-gray/30 flex-shrink-0">
          <div>
            <div className="text-sm font-extrabold text-white">Order Builder</div>
            <div className="text-xs text-neutral-600">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                copied ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <Printer className="w-3 h-3" />
              Print
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="flex flex-col border-r border-cult-medium-gray/30 flex-shrink-0 w-[270px] bg-[#0a0a0a]">
            <div className="p-3 border-b border-cult-medium-gray/20">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600" />
                <input
                  type="text"
                  placeholder="Search strains..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-cult-medium-gray/30 bg-cult-black pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {gradeOptions.map(g => {
                  const active = pickerGrade === g;
                  const gs = g !== 'all' ? GRADE_STYLES[g] : null;
                  return (
                    <button
                      key={g}
                      onClick={() => setPickerGrade(g)}
                      className={`px-1.5 py-[2px] rounded text-xs font-bold border transition-all duration-150 ${
                        active
                          ? gs
                            ? `${gs.bg} ${gs.text} ${gs.border}`
                            : 'bg-neutral-800 text-neutral-300 border-neutral-600'
                          : 'bg-transparent text-neutral-600 border-neutral-800 hover:text-neutral-400'
                      }`}
                    >
                      {g === 'all' ? 'All' : g === 'UNDEFINED' ? 'U' : g}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {availableStrains.map(s => {
                const already = selectedItems.find(i => i.strain === s.strain);
                const gs = GRADE_STYLES[s.primaryGrade];
                return (
                  <div
                    key={s.strain}
                    onClick={() => !already && addStrain(s)}
                    className={`flex items-center gap-2 px-3 py-[7px] border-b border-cult-medium-gray/10 transition-colors duration-150 ${
                      already ? 'opacity-40 cursor-default' : 'cursor-pointer hover:bg-neutral-900/80'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${gs.text.replace('text-', 'bg-')}`} />
                    <span className="text-xs font-semibold text-neutral-300 flex-1 truncate">{s.strain}</span>
                  </div>
                );
              })}
            </div>
            <div className="px-3 py-2 text-xs text-neutral-700 border-t border-cult-medium-gray/20 font-semibold">
              {availableStrains.length} available
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-4">
              {selectedItems.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-neutral-700">
                  <div className="text-2xl mb-2">&larr;</div>
                  <div className="text-xs font-semibold">Select strains from the left panel</div>
                </div>
              )}

              {selectedItems.map(item => (
                <div key={item.strain} className="mb-3 rounded-xl border border-cult-medium-gray/20 overflow-hidden bg-cult-black">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <GradeBadge grade={item.grade} />
                      <span className="text-[13px] font-bold text-neutral-200">{item.strain}</span>
                    </div>
                    <button
                      onClick={() => removeStrain(item.strain)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="px-4 pb-3">
                    {PRODUCT_FORMATS.map(f => {
                      const d = item.formats[f.id];
                      const hasQty = d.qty > 0;
                      return (
                        <div
                          key={f.id}
                          className={`flex items-center gap-2 py-[5px] rounded-lg px-2 mb-[2px] ${hasQty ? 'bg-emerald-950/20' : ''}`}
                        >
                          <span className={`text-xs font-semibold min-w-[85px] ${hasQty ? 'text-neutral-300' : 'text-neutral-600'}`}>
                            {f.label}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={d.qty || ''}
                            placeholder="0"
                            onChange={e => updateQty(item.strain, f.id, e.target.value)}
                            className="w-[52px] py-[5px] px-2 rounded-md border border-neutral-700/50 bg-neutral-800/40 text-[13px] font-semibold text-right text-white outline-none focus:border-emerald-500/50 transition-colors tabular-nums"
                          />
                          <span className="text-xs text-neutral-600">&times;</span>
                          <div className="flex items-center">
                            <span className="text-xs text-neutral-600 mr-[2px]">$</span>
                            <input
                              type="number"
                              min="0"
                              value={d.price || ''}
                              onChange={e => updatePrice(item.strain, f.id, e.target.value)}
                              className="w-[60px] py-[5px] px-2 rounded-md border border-neutral-700/50 bg-neutral-800/40 text-[13px] font-semibold text-right text-white outline-none focus:border-emerald-500/50 transition-colors tabular-nums"
                            />
                          </div>
                          {hasQty && (
                            <span className="text-xs font-bold text-emerald-400 min-w-[70px] text-right ml-auto tabular-nums">
                              = ${(d.qty * d.price).toLocaleString()}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center px-[18px] py-3 border-t border-cult-medium-gray/30 flex-shrink-0 bg-[#0c0c0c]">
              <div className="flex gap-5">
                <div>
                  <div className="text-xs font-bold text-neutral-500 tracking-[0.1em]">STRAINS</div>
                  <div className={`text-lg font-extrabold tabular-nums ${activeItems.length > 0 ? 'text-white' : 'text-neutral-700'}`}>
                    {activeItems.length}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-500 tracking-[0.1em]">UNITS</div>
                  <div className={`text-lg font-extrabold tabular-nums ${totals.units > 0 ? 'text-white' : 'text-neutral-700'}`}>
                    {totals.units}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-500 tracking-[0.1em]">EST. REVENUE</div>
                  <div className={`text-lg font-extrabold tabular-nums ${totals.revenue > 0 ? 'text-emerald-400' : 'text-neutral-700'}`}>
                    ${totals.revenue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
