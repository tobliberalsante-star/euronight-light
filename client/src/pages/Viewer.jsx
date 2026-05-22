import { useState, useEffect, useRef } from 'react';
import socket from '../socket';

function hexToRgb(hex) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function blendWithBlack(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  const f = Math.max(0, Math.min(1, factor));
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

function getEffectColor(effect, t, phase, speed, baseColor) {
  const s = Math.max(1, Math.min(10, speed));

  switch (effect) {
    case 'rainbow': {
      const hue = ((t * s * 0.05) + phase * 360) % 360;
      return `hsl(${hue},100%,50%)`;
    }
    case 'strobe': {
      const period = Math.max(40, 1000 / s);
      return Math.floor(t / period) % 2 === 0 ? '#ffffff' : '#000000';
    }
    case 'pulse': {
      const factor = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * s * 0.001 * Math.PI * 2 * 0.5));
      return blendWithBlack(baseColor, factor);
    }
    case 'wave': {
      // Phase décalée par socket.id pour créer un effet de vague entre téléphones
      const factor = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * s * 0.001 * Math.PI * 2 * 0.5 + phase * Math.PI * 2));
      return blendWithBlack(baseColor, factor);
    }
    case 'fire': {
      const noise = Math.sin(t * 0.017) + Math.sin(t * 0.0234 * s) + Math.sin(t * 0.037 * s);
      const hue = 8 + ((noise + 3) / 6) * 35;
      const lightness = 35 + ((Math.sin(t * 0.011 * s + phase) + 1) / 2) * 30;
      return `hsl(${hue},100%,${lightness}%)`;
    }
    case 'ocean': {
      const wave = Math.sin(t * s * 0.0008 + phase * Math.PI * 2);
      const hue = 200 + wave * 20;
      const lightness = 25 + ((wave + 1) / 2) * 30;
      return `hsl(${hue},70%,${lightness}%)`;
    }
    case 'disco': {
      const period = Math.max(80, 1000 / s);
      const step = Math.floor(t / period);
      const seed = (step * 7919 + Math.floor(phase * 10000)) >>> 0;
      const hue = (seed * 137) % 360;
      return `hsl(${hue},100%,60%)`;
    }
    case 'aurora': {
      const cycle = ((t * s * 0.0003) + phase) % 1;
      // vert(120) → bleu(200) → violet(300)
      const hue = 120 + cycle * 180;
      return `hsl(${hue},80%,55%)`;
    }
    case 'gold': {
      const factor = 0.5 + 0.5 * Math.sin(t * s * 0.002);
      const hue = 40 + factor * 15;
      const lightness = 45 + factor * 25;
      return `hsl(${hue},85%,${lightness}%)`;
    }
    case 'heartbeat': {
      // Double pulsation boum-boum
      const period = Math.max(400, 2000 / s);
      const pt = (t % period) / period;
      let intensity;
      if      (pt < 0.08) intensity = pt / 0.08;
      else if (pt < 0.16) intensity = 1 - (pt - 0.08) / 0.08;
      else if (pt < 0.24) intensity = (pt - 0.16) / 0.08;
      else if (pt < 0.32) intensity = 1 - (pt - 0.24) / 0.08;
      else                intensity = 0;
      return blendWithBlack(baseColor, 0.05 + 0.95 * intensity);
    }
    case 'police': {
      const period = Math.max(80, 600 / s);
      return Math.floor(t / period) % 2 === 0 ? '#ff0000' : '#0055ff';
    }
    case 'candlelight': {
      const f1 = Math.sin(t * 0.013);
      const f2 = Math.sin(t * 0.0234) * 0.5;
      const flicker = f1 + f2;
      const hue = 28 + flicker * 6;
      const lightness = 42 + flicker * 12;
      return `hsl(${hue},90%,${lightness}%)`;
    }
    case 'matrix': {
      const noise = Math.sin(t * 0.015 * s + phase) + Math.sin(t * 0.0234 * s) * 0.5;
      const lightness = 15 + ((noise + 1.5) / 3) * 50;
      return `hsl(120,100%,${lightness}%)`;
    }
    case 'sunrise': {
      const cycle = ((t * s * 0.0002) + phase) % 1;
      if (cycle < 0.3) {
        const f = cycle / 0.3;
        return `rgb(${Math.round(60 * f)},0,0)`;
      } else if (cycle < 0.6) {
        const f = (cycle - 0.3) / 0.3;
        return `rgb(${Math.round(60 + 195 * f)},${Math.round(80 * f)},0)`;
      } else {
        const f = (cycle - 0.6) / 0.4;
        return `rgb(255,${Math.round(80 + 175 * f)},${Math.round(200 * f)})`;
      }
    }
    case 'party': {
      const hue = ((t * s * 0.12) + phase * 360) % 360;
      const flashPeriod = Math.max(400, 3000 / s);
      const isFlash = (t % flashPeriod) < 80;
      return isFlash ? '#ffffff' : `hsl(${hue},100%,55%)`;
    }
    case 'fadeout': {
      const duration = 5000;
      const factor = Math.max(0, 1 - t / duration);
      return blendWithBlack(baseColor, factor);
    }
    default:
      return baseColor;
  }
}

export default function Viewer() {
  const [bgColor, setBgColor] = useState('#000000');
  const [brightness, setBrightness] = useState(1);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showTap, setShowTap] = useState(true);

  const isIOSChrome = /CriOS/i.test(navigator.userAgent);
  const [showSafariMsg, setShowSafariMsg] = useState(isIOSChrome);

  const stateRef = useRef({
    color: '#000000',
    effect: null,
    speed: 5,
    brightness: 1,
    phase: 0,
    effectStartTime: 0,
  });

  // Boucle RAF principale
  useEffect(() => {
    let rafId;
    function loop() {
      const s = stateRef.current;
      if (s.effect) {
        const t = Date.now() - s.effectStartTime;
        const color = getEffectColor(s.effect, t, s.phase, s.speed, s.color);
        setBgColor(color);

        if (s.effect === 'fadeout' && t >= 5200) {
          stateRef.current.effect = null;
          stateRef.current.color = '#000000';
          setBgColor('#000000');
        }
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Événements Socket.io
  useEffect(() => {
    const onConnect = () => {
      socket.emit('register_viewer');
      const id = socket.id || '0000';
      stateRef.current.phase = parseInt(id.slice(-4), 16) / 65535;
    };

    if (socket.connected) onConnect();
    socket.on('connect', onConnect);

    socket.on('init_state', ({ color, effect, speed, brightness: b }) => {
      stateRef.current.color = color || '#000000';
      stateRef.current.speed = speed ?? 5;
      setBrightness(b ?? 1);
      if (effect) {
        stateRef.current.effect = effect;
        stateRef.current.effectStartTime = Date.now();
      } else {
        stateRef.current.effect = null;
        setBgColor(color || '#ffffff');
      }
    });

    socket.on('color_update', ({ color }) => {
      stateRef.current.color = color;
      stateRef.current.effect = null;
      setBgColor(color);
    });

    socket.on('effect_update', ({ effect, speed }) => {
      stateRef.current.effect = effect;
      if (speed !== undefined) stateRef.current.speed = speed;
      stateRef.current.effectStartTime = Date.now();
    });

    socket.on('effect_stop', () => {
      stateRef.current.effect = null;
      setBgColor(stateRef.current.color);
    });

    socket.on('flash', () => {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 120);
    });

    socket.on('brightness_update', ({ value }) => {
      setBrightness(value);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('init_state');
      socket.off('color_update');
      socket.off('effect_update');
      socket.off('effect_stop');
      socket.off('flash');
      socket.off('brightness_update');
    };
  }, []);

  // Wake Lock API
  useEffect(() => {
    let wakeLock = null;
    const request = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (_) {}
    };
    request();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLock?.release();
    };
  }, []);

  const handleClick = () => {
    setShowTap(false);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        width: '100vw',
        height: '100dvh',
        backgroundColor: isFlashing ? '#ffffff' : bgColor,
        cursor: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    >
      {showTap && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: '1.1rem',
            fontFamily: 'sans-serif',
            letterSpacing: '0.05em',
          }}>
            Touche l'écran
          </span>
        </div>
      )}

      {showSafariMsg && (
        <div
          onClick={(e) => { e.stopPropagation(); setShowSafariMsg(false); }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            fontFamily: 'sans-serif',
            fontSize: '0.9rem',
            padding: '16px 20px',
            textAlign: 'center',
            lineHeight: 1.5,
            borderTop: '1px solid rgba(255,255,255,0.15)',
            zIndex: 10,
          }}
        >
          Pour un affichage plein écran, ouvre ce lien dans <strong>Safari</strong> puis
          "Partager → Sur l'écran d'accueil"
          <br />
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
            Touche ici pour fermer
          </span>
        </div>
      )}
    </div>
  );
}
