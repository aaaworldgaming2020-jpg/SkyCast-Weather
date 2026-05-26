/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

interface WeatherBackgroundProps {
  type: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
}

export function WeatherBackground({ type }: WeatherBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Handle updates to size
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        width = parent.clientWidth;
        height = parent.clientHeight;
        canvas.width = width;
        canvas.height = height;
      }
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Weather particles initialization
    const particles: Array<{
      x: number;
      y: number;
      vy: number;
      vx: number;
      length?: number;
      radius?: number;
      alpha: number;
      wobble?: number;
      wobbleSpeed?: number;
    }> = [];

    // Create particles base
    const numParticles = type === 'rainy' ? 120 : type === 'snowy' ? 80 : type === 'stormy' ? 150 : 25;

    for (let i = 0; i < numParticles; i++) {
      if (type === 'rainy' || type === 'stormy') {
        particles.push({
          x: Math.random() * 800,
          y: Math.random() * 800,
          vy: 8 + Math.random() * 10,
          vx: -1.5 - Math.random() * 1,
          length: 12 + Math.random() * 15,
          alpha: 0.15 + Math.random() * 0.4,
        });
      } else if (type === 'snowy') {
        particles.push({
          x: Math.random() * 800,
          y: Math.random() * 800,
          vy: 0.8 + Math.random() * 1.5,
          vx: -0.5 + Math.random() * 1.2,
          radius: 1.5 + Math.random() * 2.5,
          alpha: 0.2 + Math.random() * 0.7,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.02 + Math.random() * 0.03,
        });
      } else if (type === 'sunny') {
        // Slow rising warmth particles
        particles.push({
          x: Math.random() * 800,
          y: Math.random() * 800 + 100,
          vy: -0.2 - Math.random() * 0.4,
          vx: -0.2 + Math.random() * 0.4,
          radius: 10 + Math.random() * 25,
          alpha: 0.03 + Math.random() * 0.07,
        });
      } else {
        // Clouds particle drift
        particles.push({
          x: Math.random() * 800,
          y: Math.random() * 800,
          vy: 0,
          vx: 0.05 + Math.random() * 0.1,
          radius: 40 + Math.random() * 60,
          alpha: 0.04 + Math.random() * 0.08,
        });
      }
    }

    // Sunny center rotation
    let sunAngle = 0;

    // Stormy lightning tracker
    let lightningTime = 0;
    let lightningDuration = 0;
    let lightningX = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Render Specific Background Core Gradients
      if (type === 'sunny') {
        // Soft blue to bright warm radial
        const gradient = ctx.createRadialGradient(
          width * 0.8, height * 0.15, 10,
          width * 0.8, height * 0.15, Math.max(width, height) * 0.8
        );
        gradient.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
        gradient.addColorStop(0.2, 'rgba(249, 115, 22, 0.15)');
        gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.05)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw visual rotating secondary sun rays on canvas
        sunAngle += 0.001;
        ctx.save();
        ctx.translate(width * 0.8, height * 0.15);
        ctx.rotate(sunAngle);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.04)';
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-30, 800);
          ctx.lineTo(30, 800);
          ctx.closePath();
          ctx.fill();
          ctx.rotate(Math.PI / 4);
        }
        ctx.restore();
      } else if (type === 'cloudy') {
        // Gentle static mist gradient overlays
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(14, 165, 233, 0.1)');
        gradient.addColorStop(0.5, 'rgba(148, 163, 184, 0.15)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else if (type === 'rainy') {
        // Deep twilight rain mist
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(30, 41, 59, 0.3)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else if (type === 'snowy') {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(224, 242, 254, 0.15)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.05)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else if (type === 'stormy') {
        // Storm warning lightning overlay
        if (lightningDuration > 0) {
          lightningDuration--;
          const boltIntensity = Math.random() > 0.4 ? 1 : 0.3;
          ctx.fillStyle = `rgba(224, 242, 254, ${0.4 * boltIntensity})`;
          ctx.fillRect(0, 0, width, height);

          // Draw real fork lightning path
          ctx.strokeStyle = `rgba(254, 240, 138, ${0.9 * boltIntensity})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(lightningX, 0);
          
          let curX = lightningX;
          let curY = 0;
          while (curY < height * 0.8) {
            curX += -20 + Math.random() * 40;
            curY += 20 + Math.random() * 30;
            ctx.lineTo(curX, curY);
          }
          ctx.stroke();
        }

        // Random trigger for lightning striking
        if (Math.random() < 0.004) {
          lightningDuration = 10 + Math.floor(Math.random() * 15);
          lightningX = width * 0.2 + Math.random() * (width * 0.6);
        }
      }

      // 2. Render Physics Particles
      particles.forEach((p) => {
        // Update physics
        if (type === 'snowy') {
          p.wobble = (p.wobble || 0) + (p.wobbleSpeed || 0.01);
          p.x += p.vx + Math.sin(p.wobble) * 0.25;
          p.y += p.vy;
        } else {
          p.x += p.vx;
          p.y += p.vy;
        }

        // Recirculate particle limits
        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.x < -100) {
          p.x = width + 50;
        }
        if (p.x > width + 100) {
          p.x = -50;
        }

        // Draw particle representation
        ctx.beginPath();
        if (type === 'rainy' || type === 'stormy') {
          ctx.strokeStyle = `rgba(186, 230, 253, ${p.alpha})`;
          ctx.lineWidth = 1.5;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.5, p.y + (p.length || 15));
          ctx.stroke();
        } else if (type === 'snowy') {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.arc(p.x, p.y, p.radius || 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === 'sunny') {
          const radial = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius || 15);
          radial.addColorStop(0, `rgba(251, 191, 36, ${p.alpha})`);
          radial.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = radial;
          ctx.arc(p.x, p.y, p.radius || 15, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Cloudy
          const radial = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, p.radius || 40);
          radial.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
          radial.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = radial;
          ctx.arc(p.x, p.y, p.radius || 40, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [type]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-2xl z-0"
    />
  );
}
