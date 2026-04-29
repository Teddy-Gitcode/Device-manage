/* Root app — a click-through of the Print Fleet dashboard.
   Simulates WebSocket events by pushing a new event every ~7 seconds. */
(function () {
  const { useState, useEffect, useMemo } = React;

  function App() {
    const data = window.FleetData;
    const [events, setEvents] = useState(data.seedEvents);
    const [connected] = useState(true);
    const [selected, setSelected] = useState(null);
    const [active, setActive] = useState("dashboard");
    const [policies, setPolicies] = useState(data.policies);

    // Simulated WS feed
    useEffect(() => {
      const samples = [
        {deviceId:"PR-012", deviceName:"PR-012 · HQ Marketing", type:"job_complete", level:"ok", message:"Job completed (84 pp)"},
        {deviceId:"PR-009", deviceName:"PR-009 · Kericho Plant", type:"toner_low", level:"warning", message:"Toner low (9%)"},
        {deviceId:"PR-004", deviceName:"PR-004 · Mombasa Export", type:"jam", level:"critical", message:"Paper jam detected"},
        {deviceId:"PR-017", deviceName:"PR-017 · HQ Finance", type:"job_held", level:"warning", message:"Job held for release"},
        {deviceId:"PR-021", deviceName:"PR-021 · Kericho Floor", type:"online", level:"ok", message:"Device back online"},
      ];
      let i = 0;
      const iv = setInterval(() => {
        const s = samples[i % samples.length]; i++;
        setEvents(prev => [{...s, id: "e-"+Date.now(), timestamp: new Date().toISOString()}, ...prev].slice(0, 50));
      }, 7000);
      return () => clearInterval(iv);
    }, []);

    // derive live device status from events (newest per device wins)
    const liveStatus = useMemo(() => {
      const map = new Map();
      for (const e of events) {
        if (map.has(e.deviceId)) continue;
        if (['jam','cover_open','offline'].includes(e.type)) map.set(e.deviceId, 'danger');
        else if (['toner_low','paper_empty'].includes(e.type)) map.set(e.deviceId, 'warn');
        else if (e.type === 'online' || e.type === 'job_complete') map.set(e.deviceId, 'ok');
      }
      return map;
    }, [events]);

    const alertCount = data.devices.filter(d => (liveStatus.get(d.id) || d.status) === 'danger' || (liveStatus.get(d.id) || d.status) === 'warn').length;

    function togglePolicy(id) {
      setPolicies(ps => ps.map(p => p.id === id ? {...p, enabled: !p.enabled} : p));
    }

    return (
      <div className="app">
        <window.SuiteHeader connected={connected}/>
        <div className="main">
          <window.SideNav active={active} onSelect={setActive} alertCount={alertCount}/>
          <main className="canvas" data-screen-label="Dashboard">
            <div className="breadcrumb">Monitor <span>{window.Icons.Chevron(10)}</span> Print Fleet <span>{window.Icons.Chevron(10)}</span> Dashboard</div>
            <div className="page-head">
              <h1 className="page-title">Print Fleet Dashboard</h1>
              <div style={{display:'flex', gap:8}}>
                <button className="btn secondary">Export</button>
                <button className="btn primary">Add device</button>
              </div>
            </div>
            <window.KpiTiles devices={data.devices}/>
            <div className="dash-grid">
              <div style={{display:'flex', flexDirection:'column', gap:16}}>
                <window.DeviceTable devices={data.devices} onSelect={setSelected} liveStatus={liveStatus}/>
                <window.ReallocCards suggestions={data.realloc}/>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:16}}>
                <window.AlertFeed events={events} connected={connected}/>
                <window.StockInventory stock={data.stock}/>
              </div>
            </div>
            <div className="dash-grid" style={{marginTop:16}}>
              <window.CostByDept costs={data.costs}/>
              <window.ServiceTickets tickets={data.tickets}/>
            </div>
            <div className="dash-grid" style={{marginTop:16}}>
              <window.PrintPolicies policies={policies} onToggle={togglePolicy}/>
              <div className="card" style={{padding:'14px 16px'}}>
                <div className="card-head"><div className="card-title">Top users · 30 days</div></div>
                {data.users.map(u => {
                  const over = u.pages / u.quota;
                  return (
                    <div key={u.name} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--neutral-stroke-divider)'}}>
                      <div className="avatar" style={{background: u.color, width:28, height:28}}>{u.initials}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13, fontWeight:500}}>{u.name}</div>
                        <div style={{fontSize:11, color:'var(--neutral-fg-3)'}}>{u.dept} · {u.pages.toLocaleString()} pp · KES {u.cost.toLocaleString()}</div>
                      </div>
                      <div style={{width:100}}>
                        <div style={{height:4, background:'var(--neutral-bg-3)', borderRadius:2, overflow:'hidden'}}>
                          <div style={{height:'100%', width: Math.min(over, 1.2)*83 + '%', background: over > 1 ? 'var(--status-danger-fg)' : over > 0.8 ? 'var(--status-warning-fg)' : 'var(--m365-brand)'}}></div>
                        </div>
                        <div style={{fontSize:10, color: over > 1 ? 'var(--status-danger-fg)' : 'var(--neutral-fg-3)', marginTop:2, textAlign:'right', fontVariantNumeric:'tabular-nums'}}>{Math.round(over*100)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        </div>
        <window.DeviceDetailPanel device={selected} onClose={() => setSelected(null)}/>
      </div>
    );
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<App/>);
})();
