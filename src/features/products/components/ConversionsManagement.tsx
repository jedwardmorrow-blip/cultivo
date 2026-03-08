import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, TrendingDown, Minus, Calculator, BarChart3, AlertCircle } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import { productsService } from '../services/products.service';

interface ConversionStats {
  strain: string;
  source_type: string;
  target_type: string;
  total_conversions: number;
  avg_yield_percentage: number;
  std_dev_yield: number;
  min_yield: number;
  max_yield: number;
  avg_units_per_gram: number;
  first_conversion_date: string;
  last_conversion_date: string;
}

interface ConversionHistory {
  id: string;
  strain: string;
  source_type: string;
  target_type: string;
  average_yield_percentage: number;
  standard_deviation: number;
  confidence_interval_lower: number;
  confidence_interval_upper: number;
  sample_size: number;
  date_range_start: string;
  date_range_end: string;
}

export function ConversionsManagement() {
  const [conversionStats, setConversionStats] = useState<ConversionStats[]>([]);
  const [selectedStrain, setSelectedStrain] = useState<string>('all');
  const [strains, setStrains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [calculatorMode, setCalculatorMode] = useState<'forward' | 'reverse'>('forward');
  const [calcStrain, setCalcStrain] = useState('');
  const [calcSourceType, setCalcSourceType] = useState('flower');
  const [calcTargetType, setCalcTargetType] = useState('3.5g');
  const [calcInputWeight, setCalcInputWeight] = useState('');
  const [calcTargetUnits, setCalcTargetUnits] = useState('');
  const [projection, setProjection] = useState<{
    expectedUnits: number;
    minUnits: number;
    maxUnits: number;
    requiredWeight: number;
    minWeight: number;
    maxWeight: number;
    confidence: string;
  } | null>(null);

  useEffect(() => {
    loadConversionStats();
    loadStrains();
  }, [selectedStrain]);

  async function loadConversionStats() {
    setLoading(true);
    try {
      const data = await productsService.fetchConversionStats(selectedStrain);
      setConversionStats(data as ConversionStats[]);
    } catch (error) {
      console.error('Error loading conversion stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStrains() {
    try {
      const data = await productsService.fetchConversionStats();
      const uniqueStrains = Array.from(new Set(data?.map(d => d.strain) || []));
      setStrains(uniqueStrains);
    } catch (error) {
      console.error('Error loading strains:', error);
    }
  }

  function getConfidenceLevel(sampleSize: number): { level: string; color: string } {
    if (sampleSize >= 20) return { level: 'High', color: 'text-green-400' };
    if (sampleSize >= 5) return { level: 'Medium', color: 'text-yellow-400' };
    return { level: 'Low', color: 'text-red-400' };
  }

  function getTrendIcon(minYield: number, maxYield: number, avgYield: number) {
    const range = maxYield - minYield;
    const position = (avgYield - minYield) / range;

    if (position > 0.6) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (position < 0.4) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-yellow-400" />;
  }

  async function calculateProjection() {
    if (!calcStrain) {
      notificationService.warning('Please select a strain');
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('calculate_packaging_yield_statistics', {
          p_strain: calcStrain,
          p_source_type: calcSourceType,
          p_target_type: calcTargetType,
          p_days_back: 90
        });

      if (error) throw error;

      if (!data || data.length === 0) {
        notificationService.info('No conversion data available for this combination');
        setProjection(null);
        return;
      }

      const stats = data[0];
      const avgYield = stats.avg_yield / 100;
      const ciLower = stats.ci_lower / 100;
      const ciUpper = stats.ci_upper / 100;

      const targetWeight = parseFloat(calcTargetType.replace('g', ''));

      if (calculatorMode === 'forward') {
        const inputWeight = parseFloat(calcInputWeight);
        if (!inputWeight || inputWeight <= 0) {
          notificationService.warning('Please enter a valid input weight');
          return;
        }

        const expectedOutput = (inputWeight * avgYield) / targetWeight;
        const minOutput = (inputWeight * ciLower) / targetWeight;
        const maxOutput = (inputWeight * ciUpper) / targetWeight;

        setProjection({
          expectedUnits: Math.floor(expectedOutput),
          minUnits: Math.floor(minOutput),
          maxUnits: Math.ceil(maxOutput),
          requiredWeight: 0,
          minWeight: 0,
          maxWeight: 0,
          confidence: getConfidenceLevel(stats.sample_count).level
        });
      } else {
        const targetUnits = parseFloat(calcTargetUnits);
        if (!targetUnits || targetUnits <= 0) {
          notificationService.warning('Please enter a valid target units');
          return;
        }

        const targetOutputWeight = targetUnits * targetWeight;
        const requiredInput = targetOutputWeight / avgYield;
        const minInput = targetOutputWeight / ciUpper;
        const maxInput = targetOutputWeight / ciLower;

        setProjection({
          expectedUnits: 0,
          minUnits: 0,
          maxUnits: 0,
          requiredWeight: Math.ceil(requiredInput),
          minWeight: Math.ceil(minInput),
          maxWeight: Math.ceil(maxInput),
          confidence: getConfidenceLevel(stats.sample_count).level
        });
      }
    } catch (error) {
      console.error('Error calculating projection:', error);
      notificationService.error('Failed to calculate projection');
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-cult-white uppercase tracking-wide mb-4">
          Conversion Rates & Yield Analysis
        </h2>
        <p className="text-cult-light-gray">
          Track and analyze conversion rates from bulk inventory to packaged units. Use historical data to project outcomes and plan inventory needs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-cult-near-black border border-cult-medium-gray p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-cult-white" />
            <h3 className="text-xl font-semibold text-cult-white uppercase tracking-wide">
              Conversion Statistics
            </h3>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
              Filter by Strain
            </label>
            <select
              value={selectedStrain}
              onChange={(e) => setSelectedStrain(e.target.value)}
              className="w-full px-4 py-2 bg-cult-dark-gray border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white transition-all"
            >
              <option value="all">All Strains</option>
              {strains.map((strain) => (
                <option key={strain} value={strain}>
                  {strain}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-cult-light-gray">Loading conversion data...</div>
          ) : conversionStats.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-cult-light-gray mx-auto mb-4" />
              <p className="text-cult-light-gray">No conversion data available yet.</p>
              <p className="text-sm text-cult-lighter-gray mt-2">
                Complete packaging sessions to start tracking conversion rates.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {conversionStats.map((stat, index) => {
                const confidence = getConfidenceLevel(stat.total_conversions);

                return (
                  <div
                    key={index}
                    className="p-4 bg-cult-dark-gray border border-cult-medium-gray"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-bold text-cult-white">{stat.strain}</h4>
                        <p className="text-sm text-cult-light-gray">
                          {stat.source_type} → {stat.target_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-bold uppercase tracking-wider ${confidence.color}`}>
                          {confidence.level} Confidence
                        </div>
                        <div className="text-xs text-cult-lighter-gray mt-1">
                          {stat.total_conversions} sample{stat.total_conversions !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-cult-lighter-gray uppercase tracking-wider mb-1">
                          Avg Yield
                        </p>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(stat.min_yield, stat.max_yield, stat.avg_yield_percentage)}
                          <span className="text-lg font-bold text-cult-white">
                            {stat.avg_yield_percentage?.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-cult-lighter-gray uppercase tracking-wider mb-1">
                          Units per Gram
                        </p>
                        <span className="text-lg font-bold text-cult-white">
                          {stat.avg_units_per_gram?.toFixed(3)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-cult-near-black">
                        <p className="text-cult-lighter-gray mb-1">Min</p>
                        <p className="font-bold text-red-400">{stat.min_yield?.toFixed(1)}%</p>
                      </div>
                      <div className="p-2 bg-cult-near-black">
                        <p className="text-cult-lighter-gray mb-1">Std Dev</p>
                        <p className="font-bold text-yellow-400">{stat.std_dev_yield?.toFixed(1)}%</p>
                      </div>
                      <div className="p-2 bg-cult-near-black">
                        <p className="text-cult-lighter-gray mb-1">Max</p>
                        <p className="font-bold text-green-400">{stat.max_yield?.toFixed(1)}%</p>
                      </div>
                    </div>

                    {stat.last_conversion_date && (
                      <p className="text-xs text-cult-lighter-gray mt-3">
                        Last recorded: {new Date(stat.last_conversion_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-cult-near-black border border-cult-medium-gray p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="w-6 h-6 text-cult-white" />
            <h3 className="text-xl font-semibold text-cult-white uppercase tracking-wide">
              Projection Calculator
            </h3>
          </div>

          <div className="mb-6">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setCalculatorMode('forward');
                  setProjection(null);
                }}
                className={`flex-1 px-4 py-2 border-2 transition-all font-medium uppercase tracking-wider text-sm ${
                  calculatorMode === 'forward'
                    ? 'bg-cult-white text-cult-black border-cult-white'
                    : 'bg-cult-dark-gray text-cult-white border-cult-medium-gray hover:border-cult-white'
                }`}
              >
                Weight → Units
              </button>
              <button
                onClick={() => {
                  setCalculatorMode('reverse');
                  setProjection(null);
                }}
                className={`flex-1 px-4 py-2 border-2 transition-all font-medium uppercase tracking-wider text-sm ${
                  calculatorMode === 'reverse'
                    ? 'bg-cult-white text-cult-black border-cult-white'
                    : 'bg-cult-dark-gray text-cult-white border-cult-medium-gray hover:border-cult-white'
                }`}
              >
                Units → Weight
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                  Strain
                </label>
                <select
                  value={calcStrain}
                  onChange={(e) => {
                    setCalcStrain(e.target.value);
                    setProjection(null);
                  }}
                  className="w-full px-4 py-2 bg-cult-dark-gray border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                >
                  <option value="">Select strain...</option>
                  {strains.map((strain) => (
                    <option key={strain} value={strain}>
                      {strain}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Source Type
                  </label>
                  <select
                    value={calcSourceType}
                    onChange={(e) => {
                      setCalcSourceType(e.target.value);
                      setProjection(null);
                    }}
                    className="w-full px-4 py-2 bg-cult-dark-gray border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                  >
                    <option value="flower">Flower</option>
                    <option value="smalls">Smalls</option>
                    <option value="trim">Trim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Target Size
                  </label>
                  <select
                    value={calcTargetType}
                    onChange={(e) => {
                      setCalcTargetType(e.target.value);
                      setProjection(null);
                    }}
                    className="w-full px-4 py-2 bg-cult-dark-gray border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                  >
                    <option value="3.5g">3.5g</option>
                    <option value="14g">14g</option>
                    <option value="454g">454g</option>
                  </select>
                </div>
              </div>

              {calculatorMode === 'forward' ? (
                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Input Weight (grams)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={calcInputWeight}
                    onChange={(e) => {
                      setCalcInputWeight(e.target.value);
                      setProjection(null);
                    }}
                    placeholder="Enter weight in grams"
                    className="w-full px-4 py-2 bg-cult-dark-gray border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-cult-light-gray mb-2 uppercase tracking-wider">
                    Target Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={calcTargetUnits}
                    onChange={(e) => {
                      setCalcTargetUnits(e.target.value);
                      setProjection(null);
                    }}
                    placeholder="Enter number of units"
                    className="w-full px-4 py-2 bg-cult-dark-gray border border-cult-medium-gray text-cult-white focus:outline-none focus:border-cult-white"
                  />
                </div>
              )}

              <button
                onClick={calculateProjection}
                className="w-full px-4 py-3 bg-cult-white text-cult-black hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider"
              >
                Calculate
              </button>
            </div>
          </div>

          {projection && (
            <div className="p-4 bg-cult-dark-gray border-2 border-green-600">
              <h4 className="text-lg font-bold text-cult-white mb-4 uppercase tracking-wide">
                Projection Results
              </h4>

              {calculatorMode === 'forward' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-cult-near-black">
                    <p className="text-sm text-cult-light-gray mb-1">Expected Output</p>
                    <p className="text-2xl font-bold text-green-400">
                      {projection.expectedUnits} units
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-cult-near-black">
                      <p className="text-xs text-cult-lighter-gray mb-1">Minimum</p>
                      <p className="text-lg font-bold text-cult-white">
                        {projection.minUnits} units
                      </p>
                    </div>
                    <div className="p-3 bg-cult-near-black">
                      <p className="text-xs text-cult-lighter-gray mb-1">Maximum</p>
                      <p className="text-lg font-bold text-cult-white">
                        {projection.maxUnits} units
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-cult-near-black">
                    <p className="text-sm text-cult-light-gray mb-1">Required Input Weight</p>
                    <p className="text-2xl font-bold text-green-400">
                      {projection.requiredWeight}g
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-cult-near-black">
                      <p className="text-xs text-cult-lighter-gray mb-1">Minimum</p>
                      <p className="text-lg font-bold text-cult-white">
                        {projection.minWeight}g
                      </p>
                    </div>
                    <div className="p-3 bg-cult-near-black">
                      <p className="text-xs text-cult-lighter-gray mb-1">Maximum</p>
                      <p className="text-lg font-bold text-cult-white">
                        {projection.maxWeight}g
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 p-2 bg-cult-near-black text-center">
                <p className="text-xs text-cult-lighter-gray">
                  Confidence Level: <span className="font-bold text-cult-white">{projection.confidence}</span>
                </p>
              </div>

              <p className="text-xs text-cult-light-gray mt-4 italic">
                Projections are based on historical conversion data from the last 90 days.
                Ranges represent 95% confidence intervals.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
