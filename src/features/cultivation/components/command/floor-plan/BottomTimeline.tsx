import { FPL_TL } from './data';

export function BottomTimeline() {
  return (
    <div className="fpl-timeline">
      <div className="fpl-timeline-cap">
        <div>
          <div className="fpl-timeline-eyebrow">14 DAYS · POST-HARVEST PIPELINE</div>
          <div className="fpl-timeline-h">Harvest queue<em>3 due · 1 dry · 1 cure · 1 pkg</em></div>
        </div>
      </div>
      <div className="fpl-timeline-strip">
        {FPL_TL.map((d) => (
          <div key={d.num} className={`fpl-tl-day ${d.today ? 'is-today' : ''} ${d.weekend ? 'is-weekend' : ''}`}>
            <div className="fpl-tl-num">{d.num}</div>
            <div className="fpl-tl-name">{d.name}</div>
            {d.pill ? (
              <div className={`fpl-tl-pill ${d.pill.kind}`}>
                <div className="fpl-tl-pill-room">{d.pill.room}</div>
                <div className="fpl-tl-pill-strain">{d.pill.strain}</div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
