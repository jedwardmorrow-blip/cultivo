// Pipeline · Rollup Canvas — main app
// Layers: (a) composition, (b) density parity, (c) six state slices, (d) storyboard, (e) tweaks
(() => {
const { DesignCanvas, DCSection, DCArtboard } = window;
const { TweaksPanel, TweakSection, TweakRadio, TweakSelect, useTweaks } = window;
const { PipelineData, PipelineComposition, SkeletonRow, ErrorRow, ColdStartRow, RollupRow, PageHeader, BannerTicker, AtRiskSummary, Storyboard, VerticalStory, TwoColumnRollup, BentoRollup } = window;
const { fmt, states } = PipelineData;
const M = "'IBM Plex Mono', ui-monospace, monospace";
const S = "'IBM Plex Sans', system-ui, sans-serif";

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "italicMode": "everywhere",
  "allocChip": "dot",
  "overflowPolicy": "severity",
  "calloutVerbosity": "inline",
  "strainColumn": "visible",
  "stageDotBinding": "eyebrow-fixed"
}/*EDITMODE-END*/;

function SliceLabel({ label, sub }) {
  return <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:8, marginTop:4 }}>
    <span style={{ fontFamily:M, fontSize:10, textTransform:'uppercase', letterSpacing:'0.10em', color:'var(--accent)', fontWeight:500 }}>{label}</span>
    {sub && <span style={{ fontFamily:S, fontSize:11, color:'var(--op-ink-3)' }}>{sub}</span>}
  </div>;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const compact = t.density === 'compact';
  const banner = "Pipeline saw 3 batches clear drying this week. FLW-06 KMS harvest is 5d overdue — operations follow-up.";

  return <React.Fragment>
    <DesignCanvas>
      {/* (a) Composition at canonical width */}
      <DCSection id="composition" title="01 · Composition at canonical width"
        subtitle="Full rollup row at 1366 landscape. Room Roll Strip displaces grams-in-flight; the count moves inline to the strip header. Four numbers preserved: grams (in strip header), gross projected revenue, allocated, realized. Strip uses v3 (inline callouts, self-modulating density).">
        <DCArtboard id="comp-busy" label="Busy Tuesday · 1366 · comfortable" width={1366} height={380}>
          <PipelineComposition data={states.busy} tweaks={t} compact={false} />
        </DCArtboard>
      </DCSection>

      {/* (b) Density parity */}
      <DCSection id="density" title="02 · Density parity"
        subtitle="Comfortable and compact rendered against the same fixture (Busy Tuesday). Compact reduces number size 34→22px, row height 34→26px, tile padding 20→12px. The paired-bar chart (not shown — separate element) demotes to sparkline strip below 180px. Both at canonical 1366.">
        <DCArtboard id="density-pair" label="Comfortable + Compact · 1366" width={1366} height={720}>
          <div style={{ background:'var(--op-canvas)', padding:'24px 32px' }}>
            <SliceLabel label="Comfortable" sub="default density — 34px numbers, 34px room rows" />
            <PageHeader />
            <BannerTicker text={banner} />
            <RollupRow data={states.busy} tweaks={t} compact={false} />
            <AtRiskSummary count={states.busy.atRisk} sub={states.busy.atRiskSub} />
            <div style={{ height:1, background:'var(--op-line-strong)', margin:'20px 0 16px' }} />
            <SliceLabel label="Compact" sub="~33% vertical reduction — 22px numbers, 26px room rows" />
            <PageHeader compact={true} />
            <BannerTicker text={banner} compact={true} />
            <RollupRow data={states.busy} tweaks={t} compact={true} />
            <AtRiskSummary count={states.busy.atRisk} sub={states.busy.atRiskSub} compact={true} />
          </div>
        </DCArtboard>
      </DCSection>

      {/* (c) Six state slices */}
      <DCSection id="states" title="03 · Six state slices, fixture-driven"
        subtitle="Every state the surface must survive. Empty, loading, and error are 80% of the lived surface and have never been mocked. Calm shows the strip at minimum height (3 single-line rows). Crisis shows maximum height (3 callout rows + overflow). All at canonical 1366.">
        <DCArtboard id="state-slices" label="Six states · 1366" width={1366} height={1700}>
          <div style={{ background:'var(--op-canvas)', padding:'24px 32px' }}>
            <SliceLabel label="① Calm Tuesday" sub="3 rooms, zero callouts — strip at minimum height" />
            <RollupRow data={states.calm} tweaks={t} compact={compact} />
            <AtRiskSummary count={0} compact={compact} />

            <div style={{ height:1, background:'var(--op-line)', margin:'20px 0 16px' }} />
            <SliceLabel label="② Busy Tuesday" sub="3 rooms, one callout — FLW-06 overdue triggers second line" />
            <RollupRow data={states.busy} tweaks={t} compact={compact} />
            <AtRiskSummary count={1} sub="1 ops" compact={compact} />

            <div style={{ height:1, background:'var(--op-line)', margin:'20px 0 16px' }} />
            <SliceLabel label="③ Crisis Tuesday" sub="3 rooms with callouts + '+2 more · 1 severe' — strip at maximum height" />
            <RollupRow data={states.crisis} tweaks={t} compact={compact} />
            <AtRiskSummary count={5} sub="3 ops · 1 rev · 1 compliance" compact={compact} />

            <div style={{ height:1, background:'var(--op-line)', margin:'20px 0 16px' }} />
            <SliceLabel label="④ Cold-start" sub="fresh tenant, no shipped history, no allocations — empty state" />
            <ColdStartRow compact={compact} />

            <div style={{ height:1, background:'var(--op-line)', margin:'20px 0 16px' }} />
            <SliceLabel label="⑤ Loading" sub="skeleton state for every tile and the strip — pulsing, no data" />
            <SkeletonRow compact={compact} />

            <div style={{ height:1, background:'var(--op-line)', margin:'20px 0 16px' }} />
            <SliceLabel label="⑥ Error" sub="Supabase timeout — single-line graceful failure across the row" />
            <ErrorRow compact={compact} />
          </div>
        </DCArtboard>
      </DCSection>

      {/* (d) Morning arc storyboard */}
      <DCSection id="storyboard" title="04 · COO morning arc — 6-frame storyboard"
        subtitle="Static filmstrip. Frame 1: start of day. Frame 2: eye on FLW-06 +5d. Frame 3: drill FLW-08 deep-dive. Frame 4: return. Frame 5: persona → Cultivation Manager. Frame 6: at-risk list open. Tests that the surface behaves as a moment in someone's day.">
        <DCArtboard id="filmstrip" label="6-frame filmstrip" width={1500} height={320}>
          <div style={{ background:'var(--op-canvas)', padding:'16px 24px' }}>
            <Storyboard />
          </div>
        </DCArtboard>
      </DCSection>
      {/* (visual) Visual alternatives — more approachable, more visual */}
      <DCSection id="visual" title="05 · Visual alternatives — the pipeline as a story"
        subtitle="Same data, told visually. The stage pipeline bar shows where grams live — proportional blocks make bottlenecks impossible to miss. Revenue waterfall renders projected → allocated → realized as bars where the gap IS the visual. Three layout compositions: vertical story (top-to-bottom narrative), two-column (operations left, finance right), bento (stage hero + tile row).">
        <DCArtboard id="vis-a" label="A · Vertical story · Busy Tuesday · 1366" width={1366} height={680}>
          <VerticalStory data={states.busy} tweaks={t} compact={false} />
        </DCArtboard>
        <DCArtboard id="vis-b" label="B · Two-column · Busy Tuesday · 1366" width={1366} height={440}>
          <TwoColumnRollup data={states.busy} tweaks={t} compact={false} />
        </DCArtboard>
        <DCArtboard id="vis-c" label="C · Bento · Busy Tuesday · 1366" width={1366} height={440}>
          <BentoRollup data={states.busy} tweaks={t} compact={false} />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>

    {/* (e) Tweaks panel */}
    <TweaksPanel title="Tweaks">
      <TweakSection label="Density" />
      <TweakRadio label="Mode" value={t.density} options={['comfortable','compact']} onChange={v => setTweak('density', v)} />

      <TweakSection label="Typography" />
      <TweakRadio label="Italic load-bearing" value={t.italicMode} options={['everywhere','line-items-only']} onChange={v => setTweak('italicMode', v)} />

      <TweakSection label="Allocation chip" />
      <TweakRadio label="Style" value={t.allocChip} options={['dot','filled','outlined']} onChange={v => setTweak('allocChip', v)} />

      <TweakSection label="Room Roll Strip" />
      <TweakRadio label="+N more policy" value={t.overflowPolicy} options={['severity','count-only','hidden']} onChange={v => setTweak('overflowPolicy', v)} />
      <TweakRadio label="Callout verbosity" value={t.calloutVerbosity} options={['inline','terse','hidden']} onChange={v => setTweak('calloutVerbosity', v)} />
      <TweakRadio label="Strain column" value={t.strainColumn} options={['visible','hidden']} onChange={v => setTweak('strainColumn', v)} />
      <TweakRadio label="Stage dot binding" value={t.stageDotBinding} options={['eyebrow-fixed','per-row','none']} onChange={v => setTweak('stageDotBinding', v)} />
    </TweaksPanel>
  </React.Fragment>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
