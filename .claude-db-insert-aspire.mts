import postgres from 'postgres';

const sql = postgres('postgres://paperclip:paperclip@127.0.0.1:54329/paperclip');

try {
  // 1. Create company for Aspire
  const [company] = await sql`
    INSERT INTO companies (name, description, status, issue_prefix, brand_color)
    VALUES (
      'Powered by Aspire',
      'Hospitality revenue engineering consultancy. Founded 1998 by Renie Cavallari. Proprietary Competency Model (Mindset / Skill Set / Process Set). 28 years empirical data, 250K+ evaluations. Client brands: Four Seasons, Marriott, Auberge, Atlantis, Chase, Beemok, CoralTree, Owens Corning, Strata Health.',
      'active',
      'ASP',
      '#E11D2A'
    )
    RETURNING id, name
  `;
  console.log('Created company:', company);

  // 2. Create project for the website build
  const [project] = await sql`
    INSERT INTO projects (company_id, name, description, status, target_date)
    VALUES (
      ${company.id},
      'Website Rebuild',
      '4-page marketing site for NAVIGATE conference launch. Astro + React + Tailwind 4. Pages: Home, The Science (RCI), The Architecture (Solutions), Audit form. Deployed on Vercel at powered-by-aspire.vercel.app. Visual direction: Sophisticated Precision Engineering (dark cinematic + #E11D2A red). GitHub: jedwardmorrow-blip/powered-by-aspire.',
      'in_progress',
      '2026-04-15'
    )
    RETURNING id, name
  `;
  console.log('Created project:', project);

  // 3. Create project workspace pointing to the repo
  const [workspace] = await sql`
    INSERT INTO project_workspaces (company_id, project_id, name, cwd, repo_url, is_primary, source_type, default_ref)
    VALUES (
      ${company.id},
      ${project.id},
      'powered-by-aspire',
      '/Users/justinmorrow/Desktop/Claude/powered-by-aspire',
      'https://github.com/jedwardmorrow-blip/powered-by-aspire',
      true,
      'local_path',
      'main'
    )
    RETURNING id, name
  `;
  console.log('Created workspace:', workspace);

  // 4. Log session activity
  const sessionEvents = [
    {
      action: 'project.created',
      entity_type: 'project',
      entity_id: project.id,
      details: { event: 'Scaffolded Astro project, GitHub repo, Vercel deployment' }
    },
    {
      action: 'design.locked',
      entity_type: 'project',
      entity_id: project.id,
      details: { event: 'Checkpoint 1 — Font pairing Option A (Instrument Serif + Inter) locked', decision: 'Editorial Luxury over Geometric Precision' }
    },
    {
      action: 'section.built',
      entity_type: 'project',
      entity_id: project.id,
      details: { event: 'Home hero section built', components: ['StickyHeader', 'BaseLayout', 'Hero'] }
    },
    {
      action: 'section.built',
      entity_type: 'project',
      entity_id: project.id,
      details: { event: 'Competency Model section built from Renie interview data', components: ['CompetencyModel'], source: 'Greg×Renie interview April 4, 2026', pillars: ['Mindset', 'Skill Set', 'Process Set'] }
    },
    {
      action: 'strategy.documented',
      entity_type: 'project',
      entity_id: project.id,
      details: { event: 'Strategic memo drafted for Greg re: software product opportunity (Revenue Audit, RCI Compass, RCI Benchmark)', status: 'pending_delivery' }
    },
    {
      action: 'copy.documented',
      entity_type: 'project',
      entity_id: project.id,
      details: { event: 'Copy spec with source attribution table committed', file: 'docs/copy/home-competency-model.md', lines_needing_approval: ['binding triptych', 'compressed pull-quote'] }
    }
  ];

  for (const evt of sessionEvents) {
    await sql`
      INSERT INTO activity_log (company_id, actor_type, actor_id, action, entity_type, entity_id, details)
      VALUES (
        ${company.id},
        'agent',
        'claude-code',
        ${evt.action},
        ${evt.entity_type},
        ${evt.entity_id},
        ${sql.json(evt.details)}
      )
    `;
  }
  console.log(`Logged ${sessionEvents.length} activity events`);

  // 5. Create a project context document
  const [doc] = await sql`
    INSERT INTO documents (company_id, title, format, latest_body, created_by_user_id)
    VALUES (
      ${company.id},
      'Project Context — Website Rebuild',
      'markdown',
      ${`# Powered by Aspire — Website Rebuild

## Project Brief
4-page marketing website for NAVIGATE conference launch (target: April 15, 2026).

## Tech Stack
- Astro 6.1.3 + @astrojs/react 5.0.2 + React 19.2.4
- Tailwind CSS 4 (@tailwindcss/vite)
- TypeScript strict mode
- Vercel hosting (auto-deploy from GitHub main)

## Visual Direction
"Sophisticated Precision Engineering" — dark cinematic backgrounds + precision red (#E11D2A).
Font pairing: Instrument Serif (display) + Inter (body) + JetBrains Mono (data/code)

## Pages
1. **Home** — Hero + Competency Model + Pattern Interrupt + Authority Flex + Logo Marquee + Final CTA
2. **The Science (RCI)** — Deep dive on Competency Model, Learning Model, assessment methodology
3. **The Architecture (Solutions)** — Service offerings, engagement models
4. **Audit** — Multi-step qualifier form for Revenue Optimization Audit

## Key IP (from Renie interview, April 4, 2026)
- **Three Pillars**: Mindset → Skill Set → Process Set
- **Learning Model**: Knowledge → Application → Demonstration → Competence → Confidence
- **Key Stats**: 78% mediocre crowd, 10% 90-day lift, 72% Ink-to-the-Page close rate, $4.2B client impact
- **Named Frameworks**: Ink to the Page (group sales), Competency Model, RCI Assessment

## Deployment
- GitHub: jedwardmorrow-blip/powered-by-aspire
- Vercel: powered-by-aspire.vercel.app
- Preview: auto-deploy on push to main

## Open Strategic Questions
1. Sub-brand vs rebrand vs carve-out (A/B/C) — pending Greg call
2. Whether Renie gets named on site
3. Architecture page scope (all 7 services vs subset)
4. Domain deploy plan

## Build Status
- [x] Scaffold + deploy pipeline
- [x] BaseLayout + StickyHeader
- [x] Home hero
- [x] Competency Model section
- [ ] Pattern interrupt / social proof
- [ ] Authority flex
- [ ] Logo marquee
- [ ] Final CTA
- [ ] Page 2: The Science
- [ ] Page 3: The Architecture
- [ ] Page 4: Audit form
- [ ] Responsive + performance pass
`},
      'justin'
    )
    RETURNING id, title
  `;
  console.log('Created context document:', doc);

  console.log('\n✅ Done. Company ID:', company.id, '| Project ID:', project.id);

} finally {
  await sql.end();
}
