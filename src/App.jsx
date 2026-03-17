import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';

// --- Sub-Component: Donut Chart with Floating Tooltip ---
const DonutChart = ({ data, title, height = 300 }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ display: 'none', x: 0, y: 0, content: '', label: '' });

  useEffect(() => {
    if (!data || data.length === 0) return;

    const width = 400;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2.5}, ${height / 2})`);

    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.label))
      .range(["#00d2ff", "#99ff99", "#ff9999", "#ffcc99", "#c2c2f0"]);

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.65).outerRadius(radius);
    const arcHover = d3.arc().innerRadius(radius * 0.65).outerRadius(radius + 8);

    g.selectAll("path")
      .data(pie(data))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.label))
      .attr("stroke", "#1e1e1e")
      .style("stroke-width", "3px")
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).transition().duration(200).attr("d", arcHover);
        setTooltip({
          display: 'block',
          x: event.pageX + 15,
          y: event.pageY - 20,
          content: d.data.value.toFixed(1),
          label: d.data.label,
          color: color(d.data.label)
        });
      })
      .on("mousemove", function (event) {
        setTooltip(prev => ({ ...prev, x: event.pageX + 15, y: event.pageY - 20 }));
      })
      .on("mouseleave", function () {
        d3.select(this).transition().duration(200).attr("d", arc);
        setTooltip(prev => ({ ...prev, display: 'none' }));
      });

    // Legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width * 0.72}, ${height / 4})`);

    data.forEach((d, i) => {
      const entry = legend.append("g").attr("transform", `translate(0, ${i * 25})`);
      entry.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(d.label)).attr("rx", 2);
      entry.append("text")
        .attr("x", 20).attr("y", 10)
        .text(d.label)
        .style("font-size", "12px").attr("fill", "#888");
    });
  }, [data, height]);

  return (
    <div style={{ background: '#1e1e1e', borderRadius: '15px', padding: '20px', flex: 1 }}>
      <h3 style={{ color: '#aaa', fontWeight: '400', marginBottom: '10px', fontSize: '16px' }}>{title}</h3>
      <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 400 ${height}`}></svg>

      {/* Floating Tooltip Div */}
      <div style={{
        position: 'fixed',
        left: tooltip.x,
        top: tooltip.y,
        display: tooltip.display,
        pointerEvents: 'none',
        background: '#333',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
        zIndex: 1000,
        borderLeft: `4px solid ${tooltip.color}`,
        whiteSpace: 'nowrap'
      }}>
        <div style={{ fontWeight: 'bold' }}>{tooltip.label}</div>
        <div>Value: {tooltip.content}</div>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---
const App = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    d3.csv('/Result.csv').then(res => {
      const cats = d3.rollup(res, v => v.length, d => d.category_showroom);
      const stats = {
        footfall: res.length,
        prospects: cats.get('prospect') || 0,
        engagers: cats.get('engager') || 0,
        bounceOff: cats.get('bounce_off') || 0,
        avgTime: (d3.mean(res, d => +d.total_duration_sec) || 0).toFixed(1)
      };

      setData({
        stats,
        footfallChart: [
          { label: 'Bounce-off', value: stats.bounceOff },
          { label: 'Engagers', value: stats.engagers },
          { label: 'Prospects', value: stats.prospects }
        ],
        zoneChart: [
          { label: 'Zone A', value: d3.mean(res, d => +d.zoneA_duration_sec) || 0 },
          { label: 'Zone B', value: d3.mean(res, d => +d.zoneB_duration_sec) || 0 },
          { label: 'Zone C', value: d3.mean(res, d => +d.zoneC_duration_sec) || 0 }
        ]
      });
    });
  }, []);

  if (!data) return <div style={{ color: 'white', padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#121212', color: '#fff', minHeight: '100vh', padding: '30px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '22px', color: '#00d2ff' }}>United Motors Group Showroom Analytics</h1>
      </header>

      {/* Stats with Logos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <StatCard label="Footfall" value={data.stats.footfall} color="#00d2ff" icon="📊" />
        <StatCard label="Prospects" value={data.stats.prospects} color="#99ff99" icon="📈" />
        <StatCard label="Engagers" value={data.stats.engagers} color="#3a7bd5" icon="👤" />
        <StatCard label="Bounce-off" value={data.stats.bounceOff} color="#ff9999" icon="📉" />
        <StatCard label="Avg Time (s)" value={data.stats.avgTime} color="#ffcc99" icon="⏱️" />
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <DonutChart title="Footfall Breakdown" data={data.footfallChart} />
        <DonutChart title="Zone Engagement (Avg Sec)" data={data.zoneChart} />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, icon }) => (
  <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ color: '#888', margin: '0 0 5px 0', fontSize: '11px', textTransform: 'uppercase' }}>{label}</p>
        <h2 style={{ margin: 0, fontSize: '28px' }}>{value}</h2>
      </div>
      <div style={{ fontSize: '24px', opacity: 0.8, background: `${color}22`, padding: '10px', borderRadius: '10px' }}>
        {icon}
      </div>
    </div>
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', background: color }}></div>
  </div>
);

export default App;