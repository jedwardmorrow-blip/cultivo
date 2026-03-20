import { useNavigate } from 'react-router-dom';
import { Eye, ShieldAlert, Workflow, Zap, Database, Activity } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export function LandingPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-cult-black text-cult-text-primary relative overflow-hidden font-sans">
      {/* Noise Texture Overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-cult-border bg-cult-surface-raised/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className={`w-6 h-6 text-cult-text-primary ${mounted ? 'animate-pulse-soft' : ''}`} />
            <span className="font-display font-bold tracking-widest uppercase text-cult-text-primary text-lg">
              CultOps
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium hover:text-cult-text-primary text-cult-text-secondary transition-colors">Features</a>
            <a href="#atp" className="text-sm font-medium hover:text-cult-text-primary text-cult-text-secondary transition-colors">ATP Pipeline</a>
            <button 
              onClick={() => navigate('/login')}
              className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 bg-cult-accent text-cult-black hover:bg-cult-accent-hover transition-colors"
            >
              System Login
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 px-6">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 border border-cult-border-strong bg-cult-surface-raised px-4 py-1.5 rounded-sm">
              <div className="w-2 h-2 rounded-full bg-cult-danger animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider text-cult-text-primary">LIVE: v2.4 OPERATIONAL</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight leading-[1.1] relative group">
              <span className="block text-cult-text-primary">THE UNIFIED COMMAND CENTER</span>
              <span className="block text-cult-text-secondary mt-2 group-hover:animate-glitch">FOR COMMERCIAL CANNABIS.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-cult-text-secondary max-w-2xl mx-auto font-sans font-light leading-relaxed">
              Ditch the spreadsheets. CultOps merges cultivation, inventory ATP, and team CRM into a single, real-time nervous system powered by AI.
            </p>
            
            <div className="flex items-center justify-center gap-4 pt-8">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-cult-accent text-cult-black font-bold uppercase tracking-wider text-sm hover:bg-[#C8A84B] hover:text-white transition-all duration-300"
              >
                Request Access
              </button>
              <button className="px-8 py-4 border border-cult-border-strong text-cult-text-primary font-bold uppercase tracking-wider text-sm hover:border-cult-accent hover:bg-cult-accent/5 transition-all duration-300">
                See The AI In Action
              </button>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24 px-6 border-t border-cult-border bg-cult-surface-raised">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <h2 className="text-2xl font-display font-bold uppercase tracking-widest text-cult-text-primary mb-2">Architected for Precision</h2>
              <div className="h-1 w-12 bg-cult-accent" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature Card 1 */}
              <div className="bg-cult-surface-overlay border border-cult-border p-8 border-l-4 border-l-cult-stage-clone hover:border-cult-border-strong transition-all group">
                <Workflow className="w-8 h-8 text-cult-stage-clone mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-cult-text-primary font-display uppercase tracking-wide mb-3">Dynamic Workflow</h3>
                <p className="text-sm text-cult-text-secondary leading-relaxed">
                  Track every physical move from clone to harvest. Our batch registry engine ensures you never lose a plant group in the mix.
                </p>
              </div>

              {/* Feature Card 2 */}
              <div className="bg-cult-surface-overlay border border-cult-danger-muted p-8 border-l-4 border-l-cult-danger shadow-[0_0_15px_rgba(220,69,69,0.1)] relative">
                <div className="absolute top-4 right-4 bg-cult-danger-muted text-cult-danger border border-cult-danger/50 text-[10px] uppercase font-bold px-2 py-0.5 animate-[pulseUrgentRed_2s_infinite]">
                  Urgent
                </div>
                <ShieldAlert className="w-8 h-8 text-cult-danger mb-6" />
                <h3 className="text-lg font-bold text-cult-text-primary font-display uppercase tracking-wide mb-3">Risk Mitigation</h3>
                <p className="text-sm text-cult-text-secondary leading-relaxed">
                  Aggregated operational state alerts you before deadlines are missed. See what's overdue, instantly, with zero click depth.
                </p>
              </div>

              {/* Feature Card 3 */}
              <div className="bg-cult-surface-overlay border border-cult-border p-8 border-l-4 border-l-cult-stage-harvest hover:border-cult-border-strong transition-all group">
                <Database className="w-8 h-8 text-cult-stage-harvest mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-cult-text-primary font-display uppercase tracking-wide mb-3">Financial Nexus</h3>
                <p className="text-sm text-cult-text-secondary leading-relaxed">
                  Real-time ATP (Available-to-Promise) pipeline. Never sell what you don't have. Total visibility into bulk, trim, and packaged states.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Showcase Section */}
        <section className="py-24 px-6 border-t border-cult-border">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 border border-cult-border bg-cult-surface px-3 py-1 rounded-sm">
                <Zap className="w-3 h-3 text-cult-success-bright" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-cult-text-secondary">Powered by Claude</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-display font-bold uppercase tracking-tight text-cult-text-primary">
                Meet "The Eye"
              </h2>
              <p className="text-lg text-cult-text-secondary leading-relaxed pt-2">
                Your new Director of Operations. Talk to your facility in plain English and let the AI surface bottlenecks before they cost you money.
              </p>
              <ul className="space-y-4 pt-4">
                {['Query complex room states instantly.', 'Aggregate labor metrics without spreadsheets.', 'Enforce compliance rules proactively.'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-cult-success shrink-0 mt-0.5" />
                    <span className="text-sm text-cult-text-primary">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="lg:w-1/2 w-full">
              <div className="aspect-[4/3] bg-cult-surface-overlay border-2 border-cult-border-strong rounded-sm relative overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                {/* Mockup UI representation */}
                <div className="absolute inset-0 bg-cult-surface-raised flex flex-col p-4">
                  <div className="w-full flex items-center justify-between border-b border-cult-border pb-3">
                    <span className="font-mono text-xs text-cult-text-primary font-bold">THE EYE : ACTIVE</span>
                    <div className="w-2 h-2 rounded-full border border-cult-accent animate-[pulseSoft_2s_infinite]" />
                  </div>
                  <div className="flex-1 overflow-auto py-4 space-y-4">
                    <div className="text-xs text-cult-text-secondary self-start max-w-[80%]">Show me all flower rooms overdue for harvest.</div>
                    <div className="bg-cult-surface border border-cult-border p-3 text-xs text-cult-text-primary self-end max-w-[90%] shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]">
                      <div className="font-mono font-bold text-cult-danger mb-2 pl-2 border-l-2 border-cult-danger">FLW-07 (Overdue: 8 days)</div>
                      <div className="text-cult-text-secondary">313 plants &middot; 10 strains &middot; Urgency Level: 2</div>
                    </div>
                  </div>
                  <div className="h-10 border border-cult-border bg-cult-black mt-auto flex items-center px-4 text-xs text-cult-text-muted font-mono">Input operational query...</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-cult-border bg-cult-surface-raised py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-cult-text-secondary" />
            <span className="font-display font-bold tracking-widest uppercase text-cult-text-secondary text-sm">CULT CANNABIS CO.</span>
          </div>
          <div className="flex gap-6 text-xs font-mono text-cult-text-muted">
            <span>SYS.REQ.B2B</span>
            <a href="#" className="hover:text-cult-text-primary transition-colors">SECURITY</a>
            <a href="#" className="hover:text-cult-text-primary transition-colors">LOGIN</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
