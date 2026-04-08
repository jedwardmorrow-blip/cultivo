import { useEffect, useState } from 'react';
import { Eye, Shield, Activity, BarChart3, ArrowRight, MapPin, Calendar } from 'lucide-react';

const STAGING_URL = 'https://staging.cultops.io';

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

      {/* Subtle radial glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cult-accent/[0.04] rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10">
        {/* ── Hero ── */}
        <section className="px-6 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            {/* Event badge */}
            <div className="inline-flex items-center gap-2 border border-cult-border-strong bg-cult-surface-raised px-4 py-2 rounded-sm">
              <MapPin className="w-3.5 h-3.5 text-cult-accent" />
              <span className="text-xs font-mono font-bold tracking-wider text-cult-text-primary uppercase">
                ICBC Berlin &middot; 14–15.04.2026
              </span>
            </div>

            {/* Logo */}
            <div className={`flex items-center justify-center gap-3 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <Eye className="w-8 h-8 text-cult-text-primary" />
              <span className="font-display font-bold tracking-[0.2em] uppercase text-cult-text-primary text-2xl">
                CultOps
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight leading-[1.15]">
              <span className="block text-cult-text-primary">Operational Control</span>
              <span className="block text-cult-text-primary">for Commercial Cannabis.</span>
            </h1>

            {/* Subhead */}
            <p className="text-base md:text-lg text-cult-text-secondary leading-relaxed max-w-lg mx-auto">
              Seed-to-sale tracking, real-time inventory, AI-powered operations, and compliance reporting — unified in one command center.
            </p>

            {/* Primary CTA */}
            <div className="pt-4">
              <a
                href={STAGING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-cult-accent text-cult-opaque-black font-bold uppercase tracking-wider text-sm hover:bg-cult-accent-hover transition-all duration-300 shadow-[0_0_24px_rgba(232,224,212,0.15)]"
              >
                See the Platform
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="mx-6 border-t border-cult-border" />

        {/* ── Capability Cards ── */}
        <section className="px-6 py-16 md:py-24">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Card: Seed-to-Sale */}
            <div className="bg-cult-surface-overlay border border-cult-border p-6 md:p-8 group hover:border-cult-border-strong transition-all">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-cult-surface-raised border border-cult-border rounded-sm">
                  <BarChart3 className="w-5 h-5 text-cult-accent" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-cult-text-primary font-display uppercase tracking-wide">
                    Seed-to-Sale Traceability
                  </h3>
                  <p className="text-sm text-cult-text-secondary leading-relaxed">
                    Every gram tracked from cultivation through processing, packaging, and distribution. Batch-level chain of custody with full audit trails. Never lose visibility.
                  </p>
                </div>
              </div>
            </div>

            {/* Card: AI Operations */}
            <div className="bg-cult-surface-overlay border border-cult-border p-6 md:p-8 group hover:border-cult-border-strong transition-all">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-cult-surface-raised border border-cult-border rounded-sm">
                  <Activity className="w-5 h-5 text-cult-success" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-cult-text-primary font-display uppercase tracking-wide">
                    AI-Powered Operations
                  </h3>
                  <p className="text-sm text-cult-text-secondary leading-relaxed">
                    Query your facility in plain language. Surface bottlenecks before they cost you money. Predictive yield forecasting and anomaly detection powered by Claude.
                  </p>
                </div>
              </div>
            </div>

            {/* Card: Compliance */}
            <div className="bg-cult-surface-overlay border border-cult-border p-6 md:p-8 group hover:border-cult-border-strong transition-all">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-cult-surface-raised border border-cult-border rounded-sm">
                  <Shield className="w-5 h-5 text-cult-info" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-cult-text-primary font-display uppercase tracking-wide">
                    Compliance & Reporting
                  </h3>
                  <p className="text-sm text-cult-text-secondary leading-relaxed">
                    Audit-ready from day one. Automated compliance documentation, COA management, and regulatory reporting. Built for the complexity of commercial cannabis operations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="mx-6 border-t border-cult-border" />

        {/* ── Trust / Contact ── */}
        <section className="px-6 py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-3">
              <h2 className="text-xl md:text-2xl font-display font-bold uppercase tracking-widest text-cult-text-primary">
                Let's Connect
              </h2>
              <p className="text-sm text-cult-text-secondary leading-relaxed max-w-md mx-auto">
                We're at ICBC Berlin — schedule a live walkthrough of the platform or reach out directly.
              </p>
            </div>

            {/* Contact */}
            <div className="inline-flex flex-col items-center gap-1 bg-cult-surface-raised border border-cult-border px-8 py-5 rounded-sm">
              <span className="text-sm font-bold text-cult-text-primary">Greg Dunaway</span>
              <span className="text-xs text-cult-text-secondary">Cult Cannabis Co.</span>
              <a
                href="mailto:greg@cultcannabis.co"
                className="text-xs text-cult-accent hover:text-cult-accent-hover transition-colors mt-1"
              >
                greg@cultcannabis.co
              </a>
            </div>

            {/* Secondary CTA */}
            <div>
              <a
                href={STAGING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 border border-cult-border-strong text-cult-text-primary font-bold uppercase tracking-wider text-sm hover:border-cult-accent hover:bg-cult-accent/5 transition-all duration-300"
              >
                Explore CultOps
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-cult-border bg-cult-surface-raised py-8 px-6">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cult-text-muted" />
            <span className="font-display font-bold tracking-widest uppercase text-cult-text-muted text-xs">
              Cult Cannabis Co.
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-cult-text-muted">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              <span>ICBC Berlin &middot; 14–15.04.2026</span>
            </div>
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
          See the Platform
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {/* Bottom padding for sticky CTA on mobile */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
