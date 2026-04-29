/* Icons — inline Lucide paths used across the UI kit.
   Accessed as window.Icons.<name> in JSX. */
(function () {
  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const Svg = (size, children, extra={}) => React.createElement(
    'svg',
    { width: size, height: size, viewBox: "0 0 24 24", ...strokeProps, ...extra },
    children
  );
  const P = (props) => React.createElement('path', props);
  const R = (props) => React.createElement('rect', props);
  const L = (props) => React.createElement('line', props);
  const C = (props) => React.createElement('circle', props);

  const Icons = {
    Printer: (s=16) => Svg(s, [
      React.createElement('path', {key:'1', d:"M6 9V2h12v7"}),
      React.createElement('rect', {key:'2', x:6, y:14, width:12, height:8}),
      React.createElement('path', {key:'3', d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"}),
    ]),
    Dashboard: (s=16) => Svg(s, [
      React.createElement('rect',{key:'1', x:3, y:3, width:7, height:9}),
      React.createElement('rect',{key:'2', x:14, y:3, width:7, height:5}),
      React.createElement('rect',{key:'3', x:14, y:12, width:7, height:9}),
      React.createElement('rect',{key:'4', x:3, y:16, width:7, height:5}),
    ]),
    Package: (s=16) => Svg(s, [
      React.createElement('path',{key:'1', d:"M16.5 9.4 7.5 4.21"}),
      React.createElement('path',{key:'2', d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}),
      React.createElement('path',{key:'3', d:"M3.27 6.96 12 12.01l8.73-5.05"}),
      React.createElement('line',{key:'4', x1:12, y1:22.08, x2:12, y2:12}),
    ]),
    BarChart: (s=16) => Svg(s, [
      React.createElement('path',{key:'1', d:"M3 3v18h18"}),
      React.createElement('path',{key:'2', d:"M18 17V9"}),
      React.createElement('path',{key:'3', d:"M13 17V5"}),
      React.createElement('path',{key:'4', d:"M8 17v-3"}),
    ]),
    Alert: (s=16) => Svg(s, [
      React.createElement('path',{key:'1', d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"}),
      React.createElement('path',{key:'2', d:"M12 9v4"}),
      React.createElement('path',{key:'3', d:"M12 17h.01"}),
    ]),
    List: (s=16) => Svg(s, [
      React.createElement('line',{key:'1', x1:8, y1:6, x2:21, y2:6}),
      React.createElement('line',{key:'2', x1:8, y1:12, x2:21, y2:12}),
      React.createElement('line',{key:'3', x1:8, y1:18, x2:21, y2:18}),
      React.createElement('circle',{key:'4', cx:4, cy:6, r:0.5}),
      React.createElement('circle',{key:'5', cx:4, cy:12, r:0.5}),
      React.createElement('circle',{key:'6', cx:4, cy:18, r:0.5}),
    ]),
    Reallocate: (s=16) => Svg(s, [
      React.createElement('path',{key:'1', d:"m16 3 4 4-4 4"}),
      React.createElement('path',{key:'2', d:"M20 7H4"}),
      React.createElement('path',{key:'3', d:"m8 21-4-4 4-4"}),
      React.createElement('path',{key:'4', d:"M4 17h16"}),
    ]),
    File: (s=16) => Svg(s, [
      React.createElement('path',{key:'1', d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),
      React.createElement('path',{key:'2', d:"M14 2v6h6"}),
    ]),
    Users: (s=16) => Svg(s, [
      React.createElement('path',{key:'1', d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}),
      React.createElement('circle',{key:'2', cx:9, cy:7, r:4}),
      React.createElement('path',{key:'3', d:"M22 21v-2a4 4 0 0 0-3-3.87"}),
      React.createElement('path',{key:'4', d:"M16 3.13a4 4 0 0 1 0 7.75"}),
    ]),
    Search: (s=16) => Svg(s, [
      React.createElement('circle',{key:'1', cx:11, cy:11, r:8}),
      React.createElement('path',{key:'2', d:"m21 21-4.3-4.3"}),
    ]),
    Bell: (s=16) => Svg(s, [
      React.createElement('path',{key:'1', d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"}),
      React.createElement('path',{key:'2', d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}),
    ]),
    Settings: (s=16) => Svg(s, [
      React.createElement('circle',{key:'1', cx:12, cy:12, r:3}),
      React.createElement('path',{key:'2', d:"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"}),
    ]),
    X: (s=16) => Svg(s, [
      React.createElement('line',{key:'1', x1:18, y1:6, x2:6, y2:18}),
      React.createElement('line',{key:'2', x1:6, y1:6, x2:18, y2:18}),
    ]),
    Chevron: (s=16) => Svg(s, [
      React.createElement('polyline',{key:'1', points:"9 18 15 12 9 6"}),
    ]),
    Refresh: (s=16) => Svg(s, [
      React.createElement('path',{key:'1', d:"M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"}),
      React.createElement('path',{key:'2', d:"M21 3v5h-5"}),
    ]),
    More: (s=16) => Svg(s, [
      React.createElement('circle',{key:'1', cx:12, cy:12, r:1}),
      React.createElement('circle',{key:'2', cx:19, cy:12, r:1}),
      React.createElement('circle',{key:'3', cx:5, cy:12, r:1}),
    ]),
    Check: (s=16) => Svg(s, [
      React.createElement('polyline',{key:'1', points:"20 6 9 17 4 12"}),
    ]),
    Waffle: (s=16) => React.createElement('svg', {width:s, height:s, viewBox:"0 0 16 16"}, [
      React.createElement('rect',{key:'1', x:0, y:0, width:4, height:4, rx:0.5, fill:'currentColor'}),
      React.createElement('rect',{key:'2', x:6, y:0, width:4, height:4, rx:0.5, fill:'currentColor'}),
      React.createElement('rect',{key:'3', x:12, y:0, width:4, height:4, rx:0.5, fill:'currentColor'}),
      React.createElement('rect',{key:'4', x:0, y:6, width:4, height:4, rx:0.5, fill:'currentColor'}),
      React.createElement('rect',{key:'5', x:6, y:6, width:4, height:4, rx:0.5, fill:'currentColor'}),
      React.createElement('rect',{key:'6', x:12, y:6, width:4, height:4, rx:0.5, fill:'currentColor'}),
      React.createElement('rect',{key:'7', x:0, y:12, width:4, height:4, rx:0.5, fill:'currentColor'}),
      React.createElement('rect',{key:'8', x:6, y:12, width:4, height:4, rx:0.5, fill:'currentColor'}),
      React.createElement('rect',{key:'9', x:12, y:12, width:4, height:4, rx:0.5, fill:'currentColor'}),
    ]),
  };

  window.Icons = Icons;
})();
