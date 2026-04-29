/* ═══════════════════════════════════════════════════════════════
   Command Center v3 — Data layer + state
   Simulated live instrument data for prototype
   ═══════════════════════════════════════════════════════════════ */

const ROOMS_DATA = [
  {
    code: 'F-03', type: 'flower', plants: 312, strains: ['GMO','ZSH','RNZ'], day: 56, cycleDays: 63,
    flipDate: '2026-03-03', harvestDate: '2026-04-24', harvestDays: -4, urgency: 3,
    groups: [
      { id:'g1', strain:'GMO', abbr:'GMO', count: 120, section:'S1-A' },
      { id:'g2', strain:'Zushi', abbr:'ZSH', count: 108, section:'S2-A' },
      { id:'g3', strain:'Runtz', abbr:'RNZ', count: 84, section:'S3-A' },
    ],
    sections: [
      { id:'s1a', label:'S1-A', count: 120 },
      { id:'s2a', label:'S2-A', count: 108 },
      { id:'s3a', label:'S3-A', count: 84 },
      { id:'s4a', label:'S4-A', count: 0 },
    ],
    tasks: [
      { id:'t1', type:'Scouting', status:'done', assignee:'MARIA', time:'07:45' },
      { id:'t2', type:'Batch Tank Mix', status:'active', assignee:'CARLOS', time:null },
      { id:'t3', type:'IPM Spray', status:'pending', assignee:null, time:null },
      { id:'t4', type:'Environmental Check', status:'pending', assignee:null, time:null },
    ],
    schedule: [
      { day:'Today', tasks:'Tank mix · Scouting' },
      { day:'Tomorrow', tasks:'Defoliation' },
      { day:'Wed', tasks:'Flush prep' },
    ],
    milestones: [
      { label:'Flush start', phaseDay: 57, date:'29 Apr', warn: true },
      { label:'Harvest window', phaseDay: 63, date:'5 May', warn: false },
    ],
    feed: { summary:'Canna A/B · PK 13/14 · EC 2.4', items:[
      { name:'Canna A', ml:'4.0' },{ name:'Canna B', ml:'4.0' },{ name:'PK 13/14', ml:'1.5' },
    ], targetEC:'2.4' },
  },
  {
    code: 'F-01', type: 'flower', plants: 248, strains: ['GMO','RNZ','ZSH'], day: 42, cycleDays: 63,
    flipDate: '2026-03-17', harvestDate: '2026-05-01', harvestDays: 3, urgency: 2,
    groups: [
      { id:'g4', strain:'GMO', abbr:'GMO', count: 96, section:'S1-A' },
      { id:'g5', strain:'Runtz', abbr:'RNZ', count: 84, section:'S2-A' },
      { id:'g6', strain:'Zushi', abbr:'ZSH', count: 68, section:'S3-A' },
    ],
    sections: [
      { id:'s1b', label:'S1-A', count: 96 },
      { id:'s2b', label:'S1-B', count: 0 },
      { id:'s3b', label:'S2-A', count: 84 },
      { id:'s4b', label:'S3-A', count: 68 },
    ],
    tasks: [
      { id:'t5', type:'Batch Tank Mix', status:'done', assignee:'MARIA', time:'08:14' },
      { id:'t6', type:'Scouting', status:'done', assignee:'CARLOS', time:'09:22' },
      { id:'t7', type:'IPM Spray', status:'done', assignee:'MARIA', time:'10:05' },
      { id:'t8', type:'Defoliation', status:'done', assignee:'CARLOS', time:'11:30' },
      { id:'t9', type:'Environmental Check', status:'pending', assignee:null, time:null },
    ],
    schedule: [
      { day:'Today', tasks:'Env check' },
      { day:'Tomorrow', tasks:'Feed · Scouting' },
      { day:'Wed', tasks:'Defoliation' },
    ],
    milestones: [
      { label:'Flush start', phaseDay: 45, date:'1 May', warn: true },
      { label:'Harvest window', phaseDay: 63, date:'19 May', warn: false },
    ],
    feed: { summary:'Canna A/B · PK 13/14 · EC 2.4', items:[
      { name:'Canna A', ml:'4.0' },{ name:'Canna B', ml:'4.0' },{ name:'PK 13/14', ml:'1.5' },
    ], targetEC:'2.4' },
  },
  {
    code: 'F-02', type: 'flower', plants: 180, strains: ['PPZ','GLC'], day: 21, cycleDays: 63,
    flipDate: '2026-04-07', harvestDate: '2026-06-02', harvestDays: 35, urgency: 0,
    groups: [
      { id:'g7', strain:'Papaya Zkittlez', abbr:'PPZ', count: 100, section:'S1-A' },
      { id:'g8', strain:'Gelato Cake', abbr:'GLC', count: 80, section:'S2-A' },
    ],
    sections: [
      { id:'s1c', label:'S1-A', count: 100 },
      { id:'s2c', label:'S2-A', count: 80 },
      { id:'s3c', label:'S3-A', count: 0 },
      { id:'s4c', label:'S4-A', count: 0 },
    ],
    tasks: [
      { id:'t10', type:'Batch Tank Mix', status:'done', assignee:'MARIA', time:'08:30' },
      { id:'t11', type:'Training', status:'pending', assignee:'CARLOS', time:null },
      { id:'t12', type:'Environmental Check', status:'pending', assignee:null, time:null },
    ],
    schedule: [
      { day:'Today', tasks:'Training · Env check' },
      { day:'Tomorrow', tasks:'Scouting' },
      { day:'Wed', tasks:'Feed' },
    ],
    milestones: [
      { label:'Stretch end', phaseDay: 28, date:'5 May', warn: false },
    ],
    feed: { summary:'Canna A/B · EC 1.8', items:[
      { name:'Canna A', ml:'3.0' },{ name:'Canna B', ml:'3.0' },
    ], targetEC:'1.8' },
  },
  {
    code: 'V-01', type: 'veg', plants: 420, strains: ['GMO','RNZ','ZSH','PPZ'], day: 28, cycleDays: 42,
    flipDate: null, harvestDate: null, harvestDays: null, urgency: 0,
    groups: [
      { id:'g9', strain:'GMO', abbr:'GMO', count: 120, section:'S1' },
      { id:'g10', strain:'Runtz', abbr:'RNZ', count: 100, section:'S2' },
      { id:'g11', strain:'Zushi', abbr:'ZSH', count: 100, section:'S3' },
      { id:'g12', strain:'Papaya Zkittlez', abbr:'PPZ', count: 100, section:'S4' },
    ],
    sections: [
      { id:'sv1', label:'S1', count: 120 },
      { id:'sv2', label:'S2', count: 100 },
      { id:'sv3', label:'S3', count: 100 },
      { id:'sv4', label:'S4', count: 100 },
    ],
    tasks: [
      { id:'t13', type:'Batch Tank Mix', status:'done', assignee:'MARIA', time:'07:30' },
      { id:'t14', type:'Training', status:'done', assignee:'CARLOS', time:'09:00' },
      { id:'t15', type:'Scouting', status:'done', assignee:'MARIA', time:'10:15' },
    ],
    schedule: [
      { day:'Today', tasks:'All done' },
      { day:'Tomorrow', tasks:'Feed · Defoliation' },
      { day:'Wed', tasks:'Scouting' },
    ],
    milestones: [
      { label:'Flip target', phaseDay: 42, date:'12 May', warn: false },
    ],
    feed: { summary:'Canna A/B · EC 1.4', items:[
      { name:'Canna A', ml:'2.5' },{ name:'Canna B', ml:'2.5' },
    ], targetEC:'1.4' },
  },
  {
    code: 'V-02', type: 'veg', plants: 360, strains: ['GLC','PPZ','RNZ'], day: 38, cycleDays: 42,
    flipDate: null, harvestDate: null, harvestDays: null, urgency: 2,
    groups: [
      { id:'g13', strain:'Gelato Cake', abbr:'GLC', count: 120, section:'S1' },
      { id:'g14', strain:'Papaya Zkittlez', abbr:'PPZ', count: 120, section:'S2' },
      { id:'g15', strain:'Runtz', abbr:'RNZ', count: 120, section:'S3' },
    ],
    sections: [
      { id:'sv5', label:'S1', count: 120 },
      { id:'sv6', label:'S2', count: 120 },
      { id:'sv7', label:'S3', count: 120 },
      { id:'sv8', label:'S4', count: 0 },
    ],
    tasks: [
      { id:'t16', type:'Batch Tank Mix', status:'done', assignee:'CARLOS', time:'08:00' },
      { id:'t17', type:'Scouting', status:'done', assignee:'MARIA', time:'09:45' },
      { id:'t18', type:'Environmental Check', status:'pending', assignee:null, time:null },
    ],
    schedule: [
      { day:'Today', tasks:'Env check' },
      { day:'Tomorrow', tasks:'Flip prep · Defoliation' },
    ],
    milestones: [
      { label:'Overdue for flip', phaseDay: 35, date:'21 Apr', warn: true },
    ],
    feed: { summary:'Canna A/B · EC 1.6', items:[
      { name:'Canna A', ml:'2.8' },{ name:'Canna B', ml:'2.8' },
    ], targetEC:'1.6' },
  },
  {
    code: 'C-01', type: 'clone', plants: 500, strains: ['GMO','RNZ','ZSH','PPZ','GLC'], day: 12, cycleDays: 21,
    flipDate: null, harvestDate: null, harvestDays: null, urgency: 0,
    groups: [
      { id:'g16', strain:'GMO', abbr:'GMO', count: 100, section:'T1' },
      { id:'g17', strain:'Runtz', abbr:'RNZ', count: 100, section:'T2' },
      { id:'g18', strain:'Zushi', abbr:'ZSH', count: 100, section:'T3' },
      { id:'g19', strain:'Papaya Zkittlez', abbr:'PPZ', count: 100, section:'T4' },
      { id:'g20', strain:'Gelato Cake', abbr:'GLC', count: 100, section:'T5' },
    ],
    sections: [
      { id:'sc1', label:'T1', count: 100 },
      { id:'sc2', label:'T2', count: 100 },
      { id:'sc3', label:'T3', count: 100 },
      { id:'sc4', label:'T4', count: 100 },
      { id:'sc5', label:'T5', count: 100 },
    ],
    tasks: [
      { id:'t19', type:'Misting', status:'done', assignee:'MARIA', time:'07:00' },
      { id:'t20', type:'Environmental Check', status:'done', assignee:'CARLOS', time:'08:30' },
    ],
    schedule: [
      { day:'Today', tasks:'All done' },
      { day:'Tomorrow', tasks:'Misting · Scouting' },
    ],
    milestones: [
      { label:'Transplant', phaseDay: 21, date:'7 May', warn: false },
    ],
    feed: { summary:'Clone solution · EC 0.8', items:[
      { name:'Clone sol', ml:'1.0' },
    ], targetEC:'0.8' },
  },
  {
    code: 'M-01', type: 'mother', plants: 24, strains: ['8 genetics'], day: null, cycleDays: null,
    flipDate: null, harvestDate: null, harvestDays: null, urgency: 0,
    groups: [],
    sections: [],
    tasks: [
      { id:'t21', type:'Pruning', status:'done', assignee:'MARIA', time:'09:00' },
    ],
    schedule: [
      { day:'Today', tasks:'All done' },
      { day:'Tomorrow', tasks:'Feed' },
    ],
    milestones: [],
    feed: { summary:'Mother formula · EC 1.2', items:[
      { name:'Mother A', ml:'2.0' },{ name:'Mother B', ml:'2.0' },
    ], targetEC:'1.2' },
  },
  { code: 'F-04', type: 'flower', plants: 0, strains: [], day: null, cycleDays: null, flipDate: null, harvestDate: null, harvestDays: null, urgency: 0, groups: [], sections: [], tasks: [], schedule: [], milestones: [], feed: null },
  { code: 'V-03', type: 'veg', plants: 0, strains: [], day: null, cycleDays: null, flipDate: null, harvestDate: null, harvestDays: null, urgency: 0, groups: [], sections: [], tasks: [], schedule: [], milestones: [], feed: null },
];

const LABOR_SPARKS = {
  total: [18, 21, 24, 19, 25, 22, 23],
  done:  [10, 14, 18, 12, 20, 16, 14],
};

window.CMD_DATA = { ROOMS_DATA, LABOR_SPARKS };
