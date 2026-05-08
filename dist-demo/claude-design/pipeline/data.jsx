// Pipeline · Fixture data & state configurations
// Source: fixtures/pipeline.json · 15 production batches · 2026-04-26
const PipelineData = (() => {
  const fmt = (n) => n == null ? 'tbd' : Number(n).toLocaleString('en-US');

  const rooms = {
    calm: [
      { room:'FLW-10', days:'18d', ds:'future', g:818,  str:1, alc:'none', stg:'flower' },
      { room:'FLW-08', days:'10d', ds:'future', g:5799, str:2, alc:'none', stg:'harvest' },
      { room:'VEG-02', days:'32d', ds:'future', g:null, str:1, alc:'none', stg:'veg' },
    ],
    busy: [
      { room:'FLW-06', days:'+5d', ds:'overdue', g:null, str:1, alc:'none', stg:'flower',
        co:{ sev:'bad', t:'Harvest 5d overdue · 141 plants · KMS' }},
      { room:'FLW-08', days:'17d', ds:'future',  g:5799, str:2, alc:'none', stg:'harvest' },
      { room:'FLW-10', days:'18d', ds:'future',  g:818,  str:1, alc:'none', stg:'flower' },
    ],
    crisis: [
      { room:'FLW-06', days:'+5d',  ds:'overdue', g:null, str:1, alc:'none', stg:'flower',
        co:{ sev:'bad', t:'Harvest 5d overdue · 141 plants · KMS' }},
      { room:'FLW-08', days:'d17',  ds:'stuck',   g:5799, str:2, alc:'none', stg:'harvest',
        co:{ sev:'warn', t:'Drying d17 · target d10–14 · binning behind' }},
      { room:'FLW-07', days:'d108', ds:'stuck',   g:null, str:1, alc:'none', stg:'package',
        co:{ sev:'bad', t:'Pending session start · d108 · severe' }},
    ],
  };

  const base = {
    gramsInFlight:98412, projRevenue:112380, allocated:14240,
    realized:52340, attrRealized:16750, unattrRealized:35590,
    orders:6, lines:9,
  };

  return {
    fmt, rooms,
    states: {
      calm:   { ...base, atRisk:0, atRiskSub:'all nominal', rooms:rooms.calm, overflow:null },
      busy:   { ...base, atRisk:1, atRiskSub:'1 ops', rooms:rooms.busy, overflow:null },
      crisis: { ...base, atRisk:5, atRiskSub:'3 ops · 1 rev · 1 compliance', rooms:rooms.crisis, overflow:{ count:2, severe:1 }},
    },
  };
})();
window.PipelineData = PipelineData;
