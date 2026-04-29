/* UI kit chrome: SuiteHeader, SideNav */
(function () {
  const { useState } = React;
  const { Icons } = window;

  function SuiteHeader({ connected }) {
    return (
      <header className="suite-header">
        <div style={{color:'#fff', display:'flex', alignItems:'center'}}>{Icons.Waffle(18)}</div>
        <div className="lockup">{Icons.Printer(16)} Print Fleet</div>
        <div className="search">
          {Icons.Search(14)}
          <span>Search devices, jobs, users</span>
        </div>
        <div className="right">
          <span title={connected ? "Live" : "Reconnecting"} style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:11}}>
            <span className={"conn-dot" + (connected ? "" : " warn")} style={connected ? {} : {background:'#ffcf7a'}}></span>
            {connected ? "Live" : "Reconnecting"}
          </span>
          <span style={{color:'#fff'}}>{Icons.Bell(16)}</span>
          <span style={{color:'#fff'}}>{Icons.Settings(16)}</span>
          <div className="avatar">TM</div>
        </div>
      </header>
    );
  }

  function SideNav({ active, onSelect, alertCount }) {
    const items = [
      { id:"dashboard", label:"Dashboard", icon: Icons.Dashboard, section:"Monitor" },
      { id:"devices", label:"Devices", icon: Icons.Printer, section:"Monitor" },
      { id:"consumables", label:"Consumables", icon: Icons.Package, section:"Monitor" },
      { id:"analytics", label:"Analytics", icon: Icons.BarChart, section:"Monitor" },
      { id:"alerts", label:"Alerts", icon: Icons.Alert, section:"Monitor", count: alertCount },
      { id:"jobs", label:"Print jobs", icon: Icons.List, section:"Operate" },
      { id:"realloc", label:"Reallocation", icon: Icons.Reallocate, section:"Operate" },
      { id:"reports", label:"Reports", icon: Icons.File, section:"Operate" },
      { id:"users", label:"Users", icon: Icons.Users, section:"Admin" },
      { id:"settings", label:"Settings", icon: Icons.Settings, section:"Admin" },
    ];
    const sections = ["Monitor","Operate","Admin"];
    return (
      <nav className="sidenav">
        <div className="sidenav-inner">
          {sections.map(sec => (
            <React.Fragment key={sec}>
              <div className="nav-section">{sec}</div>
              {items.filter(i => i.section === sec).map(item => (
                <div key={item.id}
                     className={"nav-item" + (active === item.id ? " active" : "")}
                     onClick={() => onSelect(item.id)}>
                  {item.icon(14)}
                  <span>{item.label}</span>
                  {item.count ? <span className="count">{item.count}</span> : null}
                </div>
              ))}
              {sec !== "Admin" && <div className="nav-divider"></div>}
            </React.Fragment>
          ))}
          <div style={{flex:1}}></div>
          <div className="nav-user">
            <div className="avatar" style={{width:28, height:28, background:'#a4262c'}}>TM</div>
            <div>
              <div className="name">T. Mwangi</div>
              <div className="role">Fleet admin</div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  window.SuiteHeader = SuiteHeader;
  window.SideNav = SideNav;
})();
