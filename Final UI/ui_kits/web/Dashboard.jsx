/* KpiTiles, DeviceTable, AlertFeed, StockInventory, ServiceTickets,
   CostByDept, PrintPolicies, ReallocCards, DeviceDetailPanel */
(function () {
  const { useState, useEffect, useMemo } = React;
  const { Icons } = window;

  // --- sparkline helper ---
  function Sparkline({ points, color="var(--m365-brand)", width=120, height=24 }) {
    const min = Math.min(...points), max = Math.max(...points);
    const span = max - min || 1;
    const step = width / (points.length - 1);
    const d = points.map((v, i) => `${(i*step).toFixed(1)},${(height - ((v-min)/span)*(height-2) - 1).toFixed(1)}`).join(" ");
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline points={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  function KpiTiles({ devices }) {
    const active = devices.filter(d => d.status !== 'danger').length;
    const pages = devices.reduce((s,d)=>s+d.pages30d,0);
    const avgUtil = Math.round(devices.reduce((s,d)=>s+d.utilization,0) / devices.length);
    const alerts = devices.filter(d => d.status === 'danger' || d.status === 'warn').length;
    return (
      <div className="kpi-grid">
        <div className="card kpi">
          <div className="kpi-label">Active devices</div>
          <div className="kpi-num">{active}<span style={{fontSize:16, color:'var(--neutral-fg-3)', fontWeight:500}}> / {devices.length}</span></div>
          <Sparkline points={[22,24,23,25,24,26,24]} />
        </div>
        <div className="card kpi">
          <div className="kpi-label">Pages (30d)</div>
          <div className="kpi-num">{(pages/1000).toFixed(0)}k</div>
          <Sparkline points={[110,120,128,135,142,150,155]} />
        </div>
        <div className="card kpi">
          <div className="kpi-label">Avg utilization</div>
          <div className="kpi-num">{avgUtil}%</div>
          <Sparkline points={[62,65,61,64,67,63,67]} />
        </div>
        <div className="card kpi">
          <div className="kpi-label">Open alerts</div>
          <div className="kpi-num" style={{color: alerts > 0 ? 'var(--status-danger-fg)' : 'inherit'}}>{alerts}</div>
          <Sparkline points={[1,2,2,3,4,5,5]} color="var(--status-danger-fg)" />
        </div>
      </div>
    );
  }

  function Badge({ variant, children }) {
    return <span className={"badge " + variant}><span className="dot"></span>{children}</span>;
  }

  function TonerBars({ values, mono }) {
    const colors = ['#242424', '#009dd8', '#d83b9d', '#f2c811'];
    const arr = mono ? [values[0]] : values;
    return (
      <span className="toner-bars">
        {arr.map((v, i) => (
          <span className="bar" key={i}>
            <span style={{height: v + '%', background: colors[i], display:'block', position:'absolute', left:0, right:0, bottom:0}}></span>
          </span>
        ))}
      </span>
    );
  }

  function DeviceTable({ devices, onSelect, liveStatus }) {
    const labels = {ok:"Online", warn:"Warning", danger:"Needs service", neutral:"Idle"};
    return (
      <div className="card" style={{padding:0, overflow:'hidden'}}>
        <div className="card-head" style={{padding:'14px 16px', marginBottom:0}}>
          <div className="card-title">Device fleet</div>
          <button className="btn subtle small">{Icons.More(14)}</button>
        </div>
        <table className="table">
          <thead>
            <tr><th>Device</th><th>Status</th><th>Toner</th><th>Util</th><th style={{textAlign:'right'}}>Pages 30d</th><th>Rec.</th></tr>
          </thead>
          <tbody>
            {devices.map(d => {
              const status = liveStatus.get(d.id) || d.status;
              const utilC = d.utilization > 85 ? 'var(--status-danger-fg)' : d.utilization < 20 ? 'var(--neutral-fg-disabled)' : 'var(--m365-brand)';
              return (
                <tr key={d.id} onClick={() => onSelect(d)}>
                  <td>
                    <div style={{fontWeight:500}}>{d.name}</div>
                    <div style={{color:'var(--neutral-fg-3)', fontSize:11}}>{d.id} · {d.location}</div>
                  </td>
                  <td><Badge variant={status}>{labels[status]}</Badge></td>
                  <td><TonerBars values={d.toner} mono={d.mono}/></td>
                  <td style={{width:150}}>
                    <div className="util"><div style={{width: d.utilization + '%', background: utilC}}></div></div>
                    <div style={{fontSize:11, color:'var(--neutral-fg-3)', marginTop:2, fontVariantNumeric:'tabular-nums'}}>{d.utilization}%</div>
                  </td>
                  <td style={{textAlign:'right', fontVariantNumeric:'tabular-nums'}}>{d.pages30d.toLocaleString()}</td>
                  <td><span className={"chip " + d.recommendation}>{d.recommendation[0].toUpperCase()+d.recommendation.slice(1)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function AlertFeed({ events, connected }) {
    const levelClass = {critical:'danger', warning:'warn', info:'info', ok:'ok'};
    const iconFor = l => l === 'ok' ? Icons.Check(14) : <span style={{fontWeight:600, fontSize:13}}>!</span>;
    function fmt(ts) {
      const s = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
      if (s < 1) return "just now";
      if (s < 60) return s + "m ago";
      return Math.round(s/60) + "h ago";
    }
    return (
      <div className="card" style={{padding:'14px 16px'}}>
        <div className="card-head">
          <div className="card-title">Live events</div>
          <span style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:11, color:'var(--neutral-fg-3)'}}>
            <span className={"conn-dot" + (connected ? "" : " warn")}></span>
            {connected ? "Connected" : "Reconnecting"}
          </span>
        </div>
        <div style={{maxHeight:420, overflowY:'auto'}}>
          {events.map(e => (
            <div className="event" key={e.id}>
              <div className={"ei " + levelClass[e.level]}>{iconFor(e.level)}</div>
              <div style={{flex:1}}>
                <div className="msg">{e.message}</div>
                <div className="src">{e.deviceName} · {fmt(e.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function StockInventory({ stock }) {
    return (
      <div className="card" style={{padding:'14px 16px'}}>
        <div className="card-head"><div className="card-title">Consumable stock</div><button className="btn subtle small">Order</button></div>
        {stock.map(s => {
          const pct = s.qty / s.cap;
          const color = pct < 0.2 ? 'var(--status-danger-fg)' : pct < 0.4 ? 'var(--status-warning-fg)' : 'var(--status-success-fg)';
          return (
            <div className="stock-row" key={s.sku}>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:500}}>{s.name}</div>
                <div style={{fontSize:11, color:'var(--neutral-fg-3)'}}>{s.sku}</div>
              </div>
              <div className="stock-bar"><div style={{height:'100%', width: (pct*100).toFixed(0)+'%', background: color}}></div></div>
              <div style={{width:32, textAlign:'right', fontSize:12, fontWeight:600, fontVariantNumeric:'tabular-nums'}}>{s.qty}</div>
            </div>
          );
        })}
      </div>
    );
  }

  function ServiceTickets({ tickets }) {
    const labels = {high:"High", medium:"Medium", low:"Low"};
    return (
      <div className="card" style={{padding:'14px 16px'}}>
        <div className="card-head"><div className="card-title">Service tickets</div><button className="btn subtle small">View all</button></div>
        {tickets.map(t => (
          <div className={"ticket " + t.priority} key={t.id}>
            <div style={{display:'flex', gap:6, alignItems:'center'}}>
              <span className={"badge " + (t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warn' : 'info')}><span className="dot"></span>{labels[t.priority]}</span>
              <span style={{fontSize:11, color:'var(--neutral-fg-3)', fontVariantNumeric:'tabular-nums'}}>{t.id}</span>
              <span style={{fontSize:11, color:'var(--neutral-fg-3)', marginLeft:'auto'}}>{t.age}</span>
            </div>
            <div style={{fontSize:13, fontWeight:500, marginTop:4}}>{t.title}</div>
            <div style={{fontSize:11, color:'var(--neutral-fg-3)', marginTop:2}}>{t.device} · {t.assignee}</div>
          </div>
        ))}
      </div>
    );
  }

  function CostByDept({ costs }) {
    const max = Math.max(...costs.map(c => c.mono + c.color));
    return (
      <div className="card" style={{padding:'14px 16px'}}>
        <div className="card-head"><div className="card-title">Cost by department · April</div></div>
        {costs.map(c => {
          const monoW = (c.mono / max) * 100;
          const colorW = (c.color / max) * 100;
          return (
            <div key={c.dept} style={{display:'flex', alignItems:'center', gap:10, margin:'6px 0', fontVariantNumeric:'tabular-nums', fontSize:12}}>
              <span style={{width:80, color:'var(--neutral-fg-2)'}}>{c.dept}</span>
              <div style={{flex:1, height:14, display:'flex', background:'var(--neutral-bg-3)', borderRadius:3, overflow:'hidden'}}>
                <span style={{width:monoW+'%', background:'var(--m365-brand)'}}></span>
                <span style={{width:colorW+'%', background:'var(--m365-brand-tint-40)'}}></span>
              </div>
              <span style={{width:90, textAlign:'right', fontWeight:500}}>KES {(c.mono+c.color).toLocaleString()}</span>
            </div>
          );
        })}
        <div style={{display:'flex', gap:12, fontSize:10, color:'var(--neutral-fg-3)', marginTop:8}}>
          <span style={{display:'flex', gap:4, alignItems:'center'}}><span style={{width:10, height:10, background:'var(--m365-brand)'}}></span>Mono</span>
          <span style={{display:'flex', gap:4, alignItems:'center'}}><span style={{width:10, height:10, background:'var(--m365-brand-tint-40)'}}></span>Color</span>
        </div>
      </div>
    );
  }

  function PrintPolicies({ policies, onToggle }) {
    return (
      <div className="card" style={{padding:'14px 16px'}}>
        <div className="card-head"><div className="card-title">Print policies</div></div>
        {policies.map(p => (
          <div key={p.id} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--neutral-stroke-divider)'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:500}}>{p.name}</div>
              <div style={{fontSize:11, color:'var(--neutral-fg-3)'}}>{p.desc}</div>
            </div>
            <button className={"toggle" + (p.enabled ? " on" : "")} onClick={() => onToggle(p.id)} aria-label={"Toggle " + p.name}></button>
          </div>
        ))}
      </div>
    );
  }

  function ReallocCards({ suggestions }) {
    return (
      <div className="card" style={{padding:'14px 16px'}}>
        <div className="card-head"><div className="card-title">Reallocation suggestions</div></div>
        {suggestions.map((r, i) => (
          <div className="realloc" key={i}>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10, color:'var(--neutral-fg-3)', textTransform:'uppercase', letterSpacing:'.04em', fontWeight:500}}>From</div>
                <div style={{fontSize:13, fontWeight:500}}>{r.from.name}</div>
                <div style={{fontSize:11, color:'var(--neutral-fg-3)'}}>{r.from.location} · {r.from.utilLabel}</div>
              </div>
              <span style={{color:'var(--neutral-fg-3)'}}>{Icons.Reallocate(18)}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:10, color:'var(--neutral-fg-3)', textTransform:'uppercase', letterSpacing:'.04em', fontWeight:500}}>To</div>
                <div style={{fontSize:13, fontWeight:500}}>{r.to.name}</div>
                <div style={{fontSize:11, color:'var(--neutral-fg-3)'}}>{r.to.location} · {r.to.utilLabel}</div>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:8, marginTop:10, paddingTop:10, borderTop:'1px solid var(--neutral-stroke-divider)'}}>
              <span style={{fontSize:11, color:'var(--neutral-fg-3)', flex:1}}>{r.reason}</span>
              <button className="btn primary small">Approve</button>
              <button className="btn subtle small">Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function DeviceDetailPanel({ device, onClose }) {
    const [tab, setTab] = useState("overview");
    useEffect(() => { setTab("overview"); }, [device && device.id]);
    useEffect(() => {
      const h = (e) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    const open = !!device;
    const d = device;

    function Row({ k, v }) { return <div style={{display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:12, borderBottom:'1px solid var(--neutral-stroke-divider)'}}><span style={{color:'var(--neutral-fg-3)'}}>{k}</span><span style={{fontWeight:500, fontVariantNumeric:'tabular-nums'}}>{v}</span></div>; }

    return (
      <React.Fragment>
        <div className={"panel-overlay" + (open ? " open" : "")} onClick={onClose}></div>
        <aside className={"detail-panel" + (open ? " open" : "")} aria-label="Device details">
          {d && (
            <React.Fragment>
              <header>
                <div style={{display:'flex', alignItems:'flex-start', gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10, color:'var(--neutral-fg-3)', textTransform:'uppercase', letterSpacing:'.04em', fontWeight:500}}>{d.id}</div>
                    <div style={{fontSize:18, fontWeight:600, marginTop:2}}>{d.name}</div>
                    <div style={{fontSize:12, color:'var(--neutral-fg-3)'}}>{d.location}</div>
                  </div>
                  <button className="btn subtle small" onClick={onClose} aria-label="Close">{Icons.X(16)}</button>
                </div>
              </header>
              <div className="detail-toolbar">
                <button className="btn secondary small">{Icons.Refresh(14)} Poll now</button>
                <button className="btn secondary small">{Icons.Package(14)} Order toner</button>
                <button className="btn primary small">Schedule service</button>
              </div>
              <div className="tabs">
                {["overview","consumables","activity","specs"].map(t => (
                  <div key={t} className={"tab" + (t === tab ? " active" : "")} onClick={() => setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</div>
                ))}
              </div>
              <div className="body">
                {tab === "overview" && (
                  <div>
                    <Row k="Status" v={<Badge variant={d.status}>{d.status}</Badge>}/>
                    <Row k="Utilization" v={d.utilization + "%"}/>
                    <Row k="Pages (30d)" v={d.pages30d.toLocaleString()}/>
                    <Row k="Jams (30d)" v={d.jams30d}/>
                    <Row k="Uptime" v={d.uptime}/>
                    <Row k="Last service" v={d.lastService}/>
                    <Row k="Recommendation" v={<span className={"chip " + d.recommendation}>{d.recommendation[0].toUpperCase()+d.recommendation.slice(1)}</span>}/>
                  </div>
                )}
                {tab === "consumables" && (
                  <div>
                    <div style={{fontSize:11, color:'var(--neutral-fg-3)', textTransform:'uppercase', letterSpacing:'.04em', fontWeight:500, marginBottom:8}}>Toner</div>
                    {(d.mono ? ["K"] : ["K","C","M","Y"]).map((ch, i) => {
                      const colors = {K:'#242424', C:'#009dd8', M:'#d83b9d', Y:'#f2c811'};
                      const v = d.toner[i];
                      return (
                        <div key={ch} style={{display:'flex', alignItems:'center', gap:10, padding:'6px 0'}}>
                          <span style={{width:18, fontSize:11, fontWeight:600}}>{ch}</span>
                          <div style={{flex:1, height:6, background:'var(--neutral-bg-3)', borderRadius:3, overflow:'hidden'}}>
                            <div style={{height:'100%', width: v+'%', background: v < 20 ? 'var(--status-danger-fg)' : colors[ch]}}></div>
                          </div>
                          <span style={{width:40, textAlign:'right', fontSize:12, fontVariantNumeric:'tabular-nums', color: v < 20 ? 'var(--status-danger-fg)' : 'var(--neutral-fg-1)'}}>{v}%</span>
                        </div>
                      );
                    })}
                    <div style={{fontSize:11, color:'var(--neutral-fg-3)', textTransform:'uppercase', letterSpacing:'.04em', fontWeight:500, marginTop:16, marginBottom:8}}>Paper</div>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      <span style={{width:18, fontSize:11, fontWeight:600}}>P</span>
                      <div style={{flex:1, height:6, background:'var(--neutral-bg-3)', borderRadius:3, overflow:'hidden'}}>
                        <div style={{height:'100%', width: d.paper+'%', background:'var(--neutral-fg-3)'}}></div>
                      </div>
                      <span style={{width:40, textAlign:'right', fontSize:12, fontVariantNumeric:'tabular-nums'}}>{d.paper}%</span>
                    </div>
                  </div>
                )}
                {tab === "activity" && (
                  <div>
                    <div style={{fontSize:12, color:'var(--neutral-fg-3)', marginBottom:8}}>Last 7 days · pages per day</div>
                    <svg width="100%" height="90" viewBox="0 0 420 90">
                      <polyline points="0,70 60,58 120,62 180,40 240,52 300,30 360,38 420,22" fill="none" stroke="var(--m365-brand)" strokeWidth="2"/>
                      <polyline points="0,70 60,58 120,62 180,40 240,52 300,30 360,38 420,22 420,90 0,90" fill="var(--m365-brand-tint-10)" stroke="none"/>
                    </svg>
                    <div style={{marginTop:12}}>
                      {[
                        {t:"2m ago", e:"Paper jam detected", lvl:"danger"},
                        {t:"1h ago", e:"Job completed (142 pp)", lvl:"ok"},
                        {t:"3h ago", e:"Cover closed", lvl:"info"},
                        {t:"1d ago", e:"Toner replaced (K)", lvl:"info"},
                      ].map((e,i) => (
                        <div key={i} style={{display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--neutral-stroke-divider)', fontSize:12}}>
                          <span style={{width:60, color:'var(--neutral-fg-3)'}}>{e.t}</span>
                          <span>{e.e}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {tab === "specs" && (
                  <div>
                    <Row k="IP address" v={d.ip}/>
                    <Row k="MAC" v={d.mac}/>
                    <Row k="Serial" v={d.serial}/>
                    <Row k="Firmware" v={d.firmware}/>
                    <Row k="Monthly duty" v={d.monthlyDuty}/>
                    <Row k="Lifetime pages" v={d.lifetimePages.toLocaleString()}/>
                    <Row k="Cost / page" v={d.costPerPage}/>
                    <Row k="Duplex rate" v={d.duplexRate + "%"}/>
                  </div>
                )}
              </div>
            </React.Fragment>
          )}
        </aside>
      </React.Fragment>
    );
  }

  Object.assign(window, {
    KpiTiles, DeviceTable, AlertFeed, StockInventory, ServiceTickets,
    CostByDept, PrintPolicies, ReallocCards, DeviceDetailPanel, Badge, Sparkline
  });
})();
