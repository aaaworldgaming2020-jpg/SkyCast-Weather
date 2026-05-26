/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useId } from 'react';
import { Play, Pause, RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface RadarMapProps {
  latitude: number;
  longitude: number;
  cityName: string;
}

export function RadarMap({ latitude, longitude, cityName }: RadarMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [radarIntensity, setRadarIntensity] = useState('moderate');
  const [lastScanTime, setLastScanTime] = useState<string>('00:00:00');
  const containerId = useId();

  // Simulated radar cells
  const [stormCells, setStormCells] = useState<Array<{
    x: number; // distance from center -1 to 1
    y: number;
    radius: number;
    intensity: number; // 1 to 3 (green to red)
    vx: number;
    vy: number;
  }>>([
    { x: -0.3, y: -0.2, radius: 45, intensity: 2, vx: 0.002, vy: 0.001 },
    { x: 0.2, y: 0.4, radius: 65, intensity: 1, vx: 0.0015, vy: 0.0008 },
    { x: 0.45, y: -0.1, radius: 30, intensity: 3, vx: 0.0025, vy: 0.0012 },
  ]);

  useEffect(() => {
    const formatTime = () => {
      const d = new Date();
      return d.toTimeString().split(' ')[0];
    };
    setLastScanTime(formatTime());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = canvas.width;
    let height = canvas.height;

    // Pulse sweep angle
    let sweepAngle = 0;

    const render = () => {
      // Clear with radar green glow grid background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(centerX, centerY) * 0.95 * zoom;

      // 1. Draw Radar Range Rings
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.lineWidth = 1;
      
      const rings = [0.25, 0.5, 0.75, 1];
      rings.forEach(r => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * r, 0, Math.PI * 2);
        ctx.stroke();

        // Print distance labels
        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.font = '9px ui-monospace, monospace';
        ctx.fillText(`${Math.round(r * 150)} km`, centerX + 5, centerY - maxRadius * r + 10);
      });

      // 2. Crosshairs
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.stroke();

      // 3. Draw storm cell blobs using procedural canvas radial gradients
      stormCells.forEach((cell, index) => {
        // Update storm positions if isPlaying
        if (isPlaying) {
          cell.x += cell.vx;
          cell.y += cell.vy;

          // Wrap boundaries
          if (cell.x > 1.2) cell.x = -1.2;
          if (cell.y > 1.2) cell.y = -1.2;
        }

        const cellX = centerX + cell.x * maxRadius;
        const cellY = centerY + cell.y * maxRadius;

        // Radial colors based on storm intensities
        let innerColor = 'rgba(239, 68, 68, 0.75)'; // Red for peak storm
        let midColor = 'rgba(245, 158, 11, 0.55)';   // Orange for warning
        let outerColor = 'rgba(16, 185, 129, 0.3)';  // Green for light rain

        if (cell.intensity === 1) {
          innerColor = 'rgba(16, 185, 129, 0.65)';
          midColor = 'rgba(16, 185, 129, 0.35)';
          outerColor = 'rgba(16, 185, 129, 0.1)';
        } else if (cell.intensity === 2) {
          innerColor = 'rgba(245, 158, 11, 0.7)';
          midColor = 'rgba(245, 158, 11, 0.4)';
          outerColor = 'rgba(16, 185, 129, 0.15)';
        }

        // Apply radar intensity filters
        if (radarIntensity === 'light') {
          innerColor = midColor;
          midColor = outerColor;
          outerColor = 'rgba(16, 185, 129, 0.05)';
        }

        const rad = cell.radius * zoom;
        const grading = ctx.createRadialGradient(cellX, cellY, 1, cellX, cellY, rad);
        grading.addColorStop(0, innerColor);
        grading.addColorStop(0.35, midColor);
        grading.addColorStop(0.75, outerColor);
        grading.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grading;
        ctx.beginPath();
        ctx.arc(cellX, cellY, rad, 0, Math.PI * 2);
        ctx.fill();
        
        // Add random lightning storm cell flashes
        if (cell.intensity === 3 && Math.random() < 0.02 && isPlaying) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.beginPath();
          ctx.arc(cellX, cellY, rad * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 4. Sweeper Scanning line
      if (isPlaying) {
        sweepAngle += 0.025;
        if (sweepAngle >= Math.PI * 2) {
          sweepAngle = 0;
          // Refresh last scan time on sweeping full circle
          const d = new Date();
          setLastScanTime(d.toTimeString().split(' ')[0]);
        }
      }

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(sweepAngle);

      // Gradient sweep shading of modern glass cockpit radars
      const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
      sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.02)');
      sweepGrad.addColorStop(0.95, 'rgba(16, 185, 129, 0.15)');
      sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0.35)');

      // Draw sweeping sector wedge
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxRadius, -0.22, 0);
      ctx.closePath();
      ctx.fill();

      // Sweeping sharp line edge
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(maxRadius, 0);
      ctx.stroke();

      ctx.restore();

      // 5. Draw City Pointer Node
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Text label for city
      ctx.fillStyle = '#ffffff';
      ctx.font = 'semibold 10px Inter, sans-serif';
      ctx.fillText(cityName, centerX + 8, centerY + 3);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, zoom, radarIntensity, stormCells, cityName]);

  const addStormCell = () => {
    // Generate random cell coords
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.2 + Math.random() * 0.7;
    const newCell = {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      radius: 30 + Math.random() * 40,
      intensity: Math.floor(Math.random() * 3) + 1,
      vx: 0.001 + Math.random() * 0.002,
      vy: 0.0005 + Math.random() * 0.0015,
    };
    setStormCells(prev => [...prev.slice(-4), newCell]);
  };

  return (
    <div key={containerId} className="flex flex-col bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Radar Control Headers */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/40 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlaying ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <h4 className="text-xs font-mono font-medium tracking-tight text-slate-300">
            DOPPLER DOP-L8 RECON
          </h4>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono text-slate-400 select-none bg-slate-950/40 px-1.5 py-0.5 rounded">
            SCAN: {lastScanTime}
          </span>
          <span className="text-[10px] font-mono text-emerald-400">
            {latitude.toFixed(2)}°N, {longitude.toFixed(2)}°W
          </span>
        </div>
      </div>

      {/* Actual Radar Map Visual Canvas frame */}
      <div className="relative aspect-square md:aspect-auto md:h-64 flex items-center justify-center bg-slate-950">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full h-full max-w-[400px] aspect-square object-contain block"
        />

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-slate-800/70 p-2 rounded-lg text-[9px] font-mono text-slate-300 space-y-1 backdrop-blur-sm shadow shadow-black">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 px-1 rounded-sm bg-emerald-500"></span>
            <span>Light Precip</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 px-1 rounded-sm bg-yellow-500"></span>
            <span>Mid Hail Cell</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 px-1 rounded-sm bg-red-500 animate-pulse"></span>
            <span>Heavy Core Storm</span>
          </div>
        </div>

        {/* Side Mini Controllers */}
        <div className="absolute right-3 bottom-3 flex flex-col gap-2">
          <button
            onClick={() => setZoom(z => Math.min(1.5, z + 0.15))}
            className="p-1.5 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-transform active:scale-90"
            title="Radar Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
            className="p-1.5 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-transform active:scale-90"
            title="Radar Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Toolbars settings */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-slate-950/55 gap-2 border-t border-slate-800/50">
        <div className="flex gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded-lg border flex items-center gap-1 text-[10px] font-mono font-medium transition-all ${
              isPlaying
                ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isPlaying ? 'SWEEPING' : 'FREEZE'}
          </button>

          <button
            onClick={addStormCell}
            className="p-1.5 bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-mono flex items-center gap-1 transition-transform active:scale-95"
          >
            <RefreshCw className="w-3 h-3" />
            INJECT CELL
          </button>
        </div>

        {/* Filter modes select */}
        <div className="flex items-center gap-1 select-none">
          <span className="text-[9px] font-mono text-slate-400">INTENSITY:</span>
          <select
            value={radarIntensity}
            onChange={(e) => setRadarIntensity(e.target.value)}
            className="bg-slate-900 text-emerald-400 text-[10px] font-mono outline-none border border-slate-700/60 rounded px-1.5 py-0.5 focus:border-emerald-500 cursor-pointer"
          >
            <option value="light">LIGHT REFRACT</option>
            <option value="moderate">WMO DOPPLER</option>
            <option value="heavy">HOLO REFLECTIVE</option>
          </select>
        </div>
      </div>
    </div>
  );
}
