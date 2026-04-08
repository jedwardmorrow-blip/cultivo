import { useEffect, useState, useRef } from 'react';
import {
  Eye, Shield, Activity, BarChart3, ArrowRight, MapPin,
  Zap, TrendingUp, Truck, Package, Brain, CheckCircle2,
  MessageSquare, Calendar, Users
} from 'lucide-react';

const STAGING_URL = 'https://staging.cultops.io';

/** Lazy-loaded video that only starts loading when scrolled into view */
function LazyVideo({ src, poster, alt }: { src: string; poster: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: '200px' }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full overflow-hidden border border-cult-border shadow-[0_20px_50px_rgba(0,0,0,0.4)] bg-cult-opaque-black">
      {inView ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={poster}
          className="w-full h-auto"
          aria-label={alt}
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        <img src={poster} alt={alt} className="w-full h-auto" loading="lazy" />
      )}
    </div>
  );
}

export function BerlinLandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-cult-surface text-cult-text-primary font-sans relative overflow-hidden">
      {/* Noise Texture */}
      <div
        className="fixed inset-0 z-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle radial glow behind hero */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cult-accent/[0.03] rounded-full blur-[150px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-cult-border bg-cult-surface/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Eye className={`w-5 h-5 text-cult-text-primary ${mounted ? 'animate-pulse-soft' : ''}`} />
            <span className="font-display font-bold tracking-[0.15em] uppercase text-cult-text-primary text-sm">
              CultOps
            </span>
          </div>
          <a
            href={STAGING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2 bg-cult-accent text-cult-opaque-black font-bold uppercase tracking-wider text-xs hover:bg-cult-accent-hover transition-colors"
          >
            Request Access
          </a>
        </div>
      </nav>

      <main className="relative z-10">
        {/* ═══════════════════════════════════════
            HERO
        ═══════════════════════════════════════ */}
        <section className="px-5 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-3xl mx-auto text-center space-y-7">
            {/* Event badge */}
            <div className="inline-flex items-center gap-2 border border-cult-border-strong bg-cult-surface-raised px-4 py-2 rounded-sm">
              <MapPin className="w-3.5 h-3.5 text-cult-accent" />
              <span className="text-xs font-mono font-bold tracking-wider text-cult-text-primary uppercase">
                ICBC Berlin &middot; 14–15.04.2026
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight leading-[1.1]">
              <span className="block text-cult-text-primary">One Platform.</span>
              <span className="block text-cult-accent mt-1">Total Operational Control.</span>
            </h1>

            <p className="text-base md:text-xl text-cult-text-secondary leading-relaxed max-w-2xl mx-auto">
              CultOps consolidates cultivation tracking, inventory management, logistics, CRM, and compliance into a single AI-native command center — purpose-built for commercial cannabis.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <a
                href={STAGING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-cult-accent text-cult-opaque-black font-bold uppercase tracking-wider text-sm hover:bg-cult-accent-hover transition-all duration-300 shadow-[0_0_24px_rgba(232,224,212,0.15)]"
              >
                Request Access
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 border border-cult-border-strong text-cult-text-primary font-bold uppercase tracking-wider text-sm hover:border-cult-accent hover:bg-cult-accent/5 transition-all duration-300"
              >
                See the Platform
              </a>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SOCIAL PROOF BAR
        ═══════════════════════════════════════ */}
        <div className="border-y border-cult-border bg-cult-surface-raised py-8 px-5">
          <div className="max-w-6xl mx-auto text-center space-y-4">
            <p className="text-xs font-bold text-cult-text-muted uppercase tracking-[0.2em]">
              Forged on the production floor. Powering daily operations at:
            </p>
            <div className="flex justify-center items-center">
              <img
                src="/cult-logo-white.png"
                alt="Cult Cannabis Co."
                className="h-10 md:h-12 w-auto opacity-70 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            PROBLEM SECTION — "Replace your fragmented stack"
        ═══════════════════════════════════════ */}
        <section className="px-5 py-20 md:py-28">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:gap-16 items-center">
              <div className="mb-10 lg:mb-0 lg:w-1/2 space-y-6">
                <h2 className="text-2xl md:text-4xl font-display font-extrabold tracking-tight text-cult-text-primary">
                  Stop paying for a fragmented tech stack.
                </h2>
                <p className="text-base md:text-lg text-cult-text-secondary leading-relaxed">
                  Most operators run separate systems for inventory, delivery, compliance, and sales — none of which communicate. The result: data silos, manual re-entry, and decisions based on yesterday's numbers.
                </p>
                <div className="flex items-center text-cult-accent font-display font-bold text-lg md:text-xl uppercase tracking-wide">
                  <Zap className="w-5 h-5 mr-2 shrink-0" />
                  One Login. One Platform. Total Visibility.
                </div>
              </div>

              {/* Replaced tools visual */}
              <div className="lg:w-1/2 w-full">
                <div className="bg-cult-surface-overlay border border-cult-border p-8 md:p-10 relative overflow-hidden">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Inventory System', icon: Package },
                      { label: 'Delivery Routing', icon: Truck },
                      { label: 'Compliance Tracking', icon: Shield },
                      { label: 'Sales & CRM', icon: TrendingUp },
                    ].map(({ label, icon: Icon }) => (
                      <div
                        key={label}
                        className="bg-cult-surface-raised border border-cult-border p-4 flex flex-col items-center gap-2 relative"
                      >
                        <Icon className="w-6 h-6 text-cult-text-muted" />
                        <span className="text-xs text-cult-text-muted text-center font-medium">{label}</span>
                        {/* Strike-through line */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-[110%] h-[1.5px] bg-cult-danger/60 -rotate-12" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* "Replaced" badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className="text-xs font-bold text-cult-danger tracking-[0.25em] uppercase bg-cult-opaque-black/90 px-5 py-2 border border-cult-danger/30 backdrop-blur-sm shadow-[0_0_20px_rgba(220,69,69,0.1)]">
                      Replaced
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            FEATURES
        ═══════════════════════════════════════ */}
        <section id="features" className="border-t border-cult-border bg-cult-surface-raised px-5 py-20 md:py-28">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-2xl md:text-4xl font-display font-extrabold tracking-tight text-cult-text-primary">
                Engineered for the Operator
              </h2>
              <div className="h-1 w-12 bg-cult-accent mx-auto mt-4" />
            </div>

            {/* Feature 1: Visual Ops & Production */}
            <div className="flex flex-col lg:flex-row lg:gap-14 items-center mb-20 md:mb-28">
              <div className="w-full lg:w-1/2 mb-8 lg:mb-0">
                <LazyVideo
                  src="/berlin/feature-visual-ops.mp4"
                  poster="/berlin/poster-visual-ops.jpg"
                  alt="Visual room mapping and production tracking"
                />
              </div>
              <div className="w-full lg:w-1/2 space-y-5">
                <h3 className="text-xl md:text-2xl font-display font-bold text-cult-text-primary">
                  Facility-Wide Visibility in Real Time
                </h3>
                <p className="text-base text-cult-text-secondary leading-relaxed">
                  Map every strain, every room, every stage of production. Track worker efficiency at the gram-per-hour level and see supply vs. demand gaps as they emerge — not after the fact.
                </p>
                <ul className="space-y-3">
                  {[
                    'Clone-to-sale batch tracking with full chain of custody',
                    'Per-worker G/HR efficiency metrics and leaderboards',
                    'Solventless processing workflows (rosin, hash, live)',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-cult-success shrink-0 mt-0.5" />
                      <span className="text-sm text-cult-text-primary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 2: AI Operations */}
            <div className="flex flex-col lg:flex-row-reverse lg:gap-14 items-center mb-20 md:mb-28">
              <div className="w-full lg:w-1/2 mb-8 lg:mb-0">
                <LazyVideo
                  src="/berlin/feature-cult-ai.mp4"
                  poster="/berlin/poster-cult-ai.jpg"
                  alt="Cult AI co-pilot answering operational queries"
                />
              </div>
              <div className="w-full lg:w-1/2 space-y-5">
                <div className="inline-flex items-center gap-2 border border-cult-border bg-cult-surface px-3 py-1 rounded-sm">
                  <Zap className="w-3 h-3 text-cult-success" />
                  <span className="text-xs font-mono uppercase tracking-wider text-cult-text-secondary">Powered by Claude</span>
                </div>
                <h3 className="text-xl md:text-2xl font-display font-bold text-cult-text-primary">
                  Your AI Director of Operations
                </h3>
                <p className="text-base text-cult-text-secondary leading-relaxed">
                  Ask plain-language questions about your entire facility and get context-aware answers in seconds. Cult AI knows your team, understands your momentum indicators, and identifies revenue bottlenecks before they cost you money.
                </p>
                <ul className="space-y-3">
                  {[
                    'Natural language queries across all operational data',
                    'Proactive bottleneck detection and yield forecasting',
                    'Compliance risk flagging before violations occur',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-cult-success shrink-0 mt-0.5" />
                      <span className="text-sm text-cult-text-primary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 3: Logistics & Compliance */}
            <div className="flex flex-col lg:flex-row lg:gap-14 items-center">
              <div className="w-full lg:w-1/2 mb-8 lg:mb-0">
                <LazyVideo
                  src="/berlin/feature-logistics.mp4"
                  poster="/berlin/poster-logistics.jpg"
                  alt="Automated delivery routing and logistics"
                />
              </div>
              <div className="w-full lg:w-1/2 space-y-5">
                <h3 className="text-xl md:text-2xl font-display font-bold text-cult-text-primary">
                  Logistics & Compliance, Built In
                </h3>
                <p className="text-base text-cult-text-secondary leading-relaxed">
                  Route deliveries by region, generate manifests and invoices with one click, and maintain audit-ready compliance documentation — all from within the same platform you run production on.
                </p>
                <ul className="space-y-3">
                  {[
                    'Automated delivery routing batched by region',
                    'One-click manifest and invoice generation',
                    'Full COA management with batch-level traceability',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-cult-success shrink-0 mt-0.5" />
                      <span className="text-sm text-cult-text-primary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            PRICING
        ═══════════════════════════════════════ */}
        <section className="border-t border-cult-border px-5 py-20 md:py-28">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-2xl md:text-4xl font-display font-extrabold tracking-tight text-cult-text-primary mb-3">
                Pricing Built on ROI
              </h2>
              <p className="text-base text-cult-text-secondary">
                Replace four subscriptions with one platform.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 md:gap-6">
              {/* Growth */}
              <div className="bg-cult-surface-overlay border border-cult-border p-7 flex flex-col hover:border-cult-border-strong transition-all">
                <h3 className="text-xl font-display font-bold text-cult-text-primary mb-1">Growth</h3>
                <p className="text-xs text-cult-text-secondary mb-5">For single-facility cultivators scaling up.</p>
                <div className="text-3xl font-display font-extrabold text-cult-text-primary mb-6">
                  $1,200<span className="text-sm text-cult-text-muted font-normal">/mo</span>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {['Cultivation Command Center', 'Clone-to-Sale Inventory', 'Basic CRM Hub', 'Compliance Reporting'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-cult-text-secondary">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cult-accent shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={STAGING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 border border-cult-border-strong text-cult-text-primary font-bold uppercase tracking-wider text-xs text-center hover:border-cult-accent hover:text-cult-accent transition-colors"
                >
                  Request Access
                </a>
              </div>

              {/* Pro — highlighted */}
              <div className="bg-cult-surface-overlay border-2 border-cult-accent p-7 flex flex-col relative shadow-[0_0_30px_rgba(232,224,212,0.08)] md:-translate-y-2">
                <div className="absolute top-0 right-0 bg-cult-accent text-cult-opaque-black font-bold py-1 px-3 text-[10px] tracking-[0.15em] uppercase">
                  Most Popular
                </div>
                <h3 className="text-xl font-display font-bold text-cult-text-primary mb-1">Pro</h3>
                <p className="text-xs text-cult-text-secondary mb-5">For vertically integrated, mid-market brands.</p>
                <div className="text-3xl font-display font-extrabold text-cult-text-primary mb-6">
                  $2,500<span className="text-sm text-cult-text-muted font-normal">/mo</span>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {[
                    'Everything in Growth',
                    'Native Logistics Engine',
                    'Cult AI Analytics',
                    'Rosin Lab Workflows',
                  ].map((f, i) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${i === 0 ? 'text-cult-text-secondary' : 'text-cult-text-primary font-medium'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-cult-accent shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={STAGING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-cult-accent text-cult-opaque-black font-bold uppercase tracking-wider text-xs text-center hover:bg-cult-accent-hover transition-colors shadow-lg"
                >
                  Request Access
                </a>
              </div>

              {/* Enterprise */}
              <div className="bg-cult-surface-overlay border border-cult-border p-7 flex flex-col hover:border-cult-border-strong transition-all">
                <h3 className="text-xl font-display font-bold text-cult-text-primary mb-1">Enterprise</h3>
                <p className="text-xs text-cult-text-secondary mb-5">For multi-facility and multi-market operators.</p>
                <div className="text-3xl font-display font-extrabold text-cult-text-primary mb-6">Custom</div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {[
                    'Multi-Facility Dashboard',
                    'Unlimited User Seats',
                    'Dedicated AI Memory Bank',
                    'Custom API Integrations',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-cult-text-secondary">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cult-accent shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:greg@cultcannabis.co"
                  className="w-full py-3 border border-cult-border-strong text-cult-text-primary font-bold uppercase tracking-wider text-xs text-center hover:border-cult-accent hover:text-cult-accent transition-colors"
                >
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            CONNECT — ICBC Berlin CTA
        ═══════════════════════════════════════ */}
        <section className="border-t border-cult-border bg-cult-surface-raised px-5 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-2xl md:text-3xl font-display font-extrabold text-cult-text-primary">
              See It Live at ICBC Berlin
            </h2>
            <p className="text-base text-cult-text-secondary leading-relaxed max-w-xl mx-auto">
              We're on the ground in Berlin, 14–15 April. Schedule a walkthrough of the platform or connect with us directly at the conference.
            </p>

            {/* Contact card */}
            <div className="inline-flex flex-col items-center gap-2 bg-cult-surface-overlay border border-cult-border px-8 py-6">
              <span className="text-base font-bold text-cult-text-primary">Greg Dunaway</span>
              <span className="text-xs text-cult-text-secondary">Cult Cannabis Co.</span>
              <div className="flex items-center gap-4 mt-2">
                <a
                  href="mailto:greg@cultcannabis.co"
                  className="inline-flex items-center gap-1.5 text-xs text-cult-accent hover:text-cult-accent-hover transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  greg@cultcannabis.co
                </a>
              </div>
            </div>

            <a
              href={STAGING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-10 py-4 bg-cult-accent text-cult-opaque-black font-bold uppercase tracking-wider text-sm hover:bg-cult-accent-hover transition-all duration-300 shadow-[0_0_24px_rgba(232,224,212,0.15)]"
            >
              Request Access
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-cult-border py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cult-text-muted" />
            <span className="font-display font-bold tracking-widest uppercase text-cult-text-muted text-xs">
              Cult Cannabis Co.
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs text-cult-text-muted">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              <span>ICBC Berlin &middot; 14–15.04.2026</span>
            </div>
            <a href={STAGING_URL} target="_blank" rel="noopener noreferrer" className="hover:text-cult-text-primary transition-colors">
              Login
            </a>
          </div>
        </div>
      </footer>

      {/* ── Sticky Mobile CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-cult-opaque-black via-cult-opaque-black/95 to-transparent md:hidden">
        <a
          href={STAGING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 bg-cult-accent text-cult-opaque-black font-bold uppercase tracking-wider text-sm shadow-[0_0_24px_rgba(232,224,212,0.2)]"
        >
          Request Access
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {/* Bottom padding for sticky CTA on mobile */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
