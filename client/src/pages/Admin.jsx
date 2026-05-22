import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import socket from '../socket';
import styles from './Admin.module.css';

const PRESET_COLORS = [
  { name: 'Blanc',      hex: '#ffffff' },
  { name: 'Noir',       hex: '#000000' },
  { name: 'Rouge',      hex: '#ff1a1a' },
  { name: 'Rose',       hex: '#ff69b4' },
  { name: 'Or',         hex: '#f0c060' },
  { name: 'Jaune',      hex: '#ffe566' },
  { name: 'Émeraude',   hex: '#2ef0a0' },
  { name: 'Bleu royal', hex: '#3f6cff' },
  { name: 'Bleu ciel',  hex: '#00bfff' },
  { name: 'Violet',     hex: '#a855f7' },
  { name: 'Orange',     hex: '#ff8c42' },
  { name: 'Corail',     hex: '#ff6b6b' },
  { name: 'Cyan',       hex: '#00ffff' },
  { name: 'Lime',       hex: '#aaff00' },
  { name: 'Magenta',    hex: '#ff00ff' },
];

const EFFECTS = [
  { id: 'rainbow',    label: 'Rainbow',   emoji: '🌈' },
  { id: 'strobe',     label: 'Strobe',    emoji: '⚡' },
  { id: 'pulse',      label: 'Pulse',     emoji: '💫' },
  { id: 'wave',       label: 'Vague',     emoji: '🌊' },
  { id: 'fire',       label: 'Feu',       emoji: '🔥' },
  { id: 'ocean',      label: 'Océan',     emoji: '🐋' },
  { id: 'disco',      label: 'Disco',     emoji: '🕺' },
  { id: 'aurora',     label: 'Aurore',    emoji: '🌌' },
  { id: 'gold',       label: 'Or',        emoji: '✨' },
  { id: 'heartbeat',  label: 'Cœur',      emoji: '💓' },
  { id: 'police',     label: 'Police',    emoji: '🚨' },
  { id: 'candlelight',label: 'Bougie',    emoji: '🕯️' },
  { id: 'matrix',     label: 'Matrix',    emoji: '💻' },
  { id: 'sunrise',    label: 'Lever',     emoji: '🌅' },
  { id: 'party',      label: 'Party',     emoji: '🎉' },
];

export default function Admin() {
  const [activeColor, setActiveColor] = useState('#ffffff');
  const [activeEffect, setActiveEffect] = useState(null);
  const [speed, setSpeed] = useState(5);
  const [brightness, setBrightness] = useState(1);
  const [customColor, setCustomColor] = useState('#ffffff');
  const [hexInput, setHexInput] = useState('#ffffff');
  const [viewerCount, setViewerCount] = useState(0);
  const [showQR, setShowQR] = useState(false);

  const bouquetTimerRef = useRef(null);
  const prevStateRef = useRef(null);
  const speedRef = useRef(5);

  const viewerUrl = `${window.location.protocol}//${window.location.host}`;

  useEffect(() => {
    const onConnect = () => socket.emit('register_admin');
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);

    socket.on('viewer_count', ({ count }) => setViewerCount(count));

    socket.on('init_state', ({ color, effect, speed: s, brightness: b }) => {
      if (color) { setActiveColor(color); setCustomColor(color); setHexInput(color); }
      if (effect) setActiveEffect(effect);
      if (s) { setSpeed(s); speedRef.current = s; }
      if (b !== undefined) setBrightness(b);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('viewer_count');
      socket.off('init_state');
    };
  }, []);

  const sendColor = (color) => {
    setActiveColor(color);
    setActiveEffect(null);
    socket.emit('set_color', { color });
  };

  const sendEffect = (effectId, overrideSpeed) => {
    const s = overrideSpeed ?? speedRef.current;
    setActiveEffect(effectId);
    socket.emit('set_effect', { effect: effectId, speed: s });
  };

  const stopEffect = () => {
    setActiveEffect(null);
    socket.emit('stop_effect');
  };

  const handleSpeedChange = (val) => {
    speedRef.current = val;
    setSpeed(val);
    if (activeEffect) {
      socket.emit('set_effect', { effect: activeEffect, speed: val });
    }
  };

  const handleBrightnessChange = (val) => {
    setBrightness(val);
    socket.emit('set_brightness', { value: val });
  };

  const handleHexInput = (val) => {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setCustomColor(val);
    }
  };

  // Moments spéciaux
  const handleFlash = () => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => socket.emit('flash'), i * 220);
    }
  };

  const handleEntreeMaries = () => {
    sendColor('#ffffff');
    setTimeout(() => sendEffect('pulse', 2), 50);
  };

  const handlePremiereDanse = () => {
    sendEffect('gold', 3);
  };

  const handleBouquet = () => {
    prevStateRef.current = { color: activeColor, effect: activeEffect, speed: speedRef.current };
    sendEffect('party', 8);
    if (bouquetTimerRef.current) clearTimeout(bouquetTimerRef.current);
    bouquetTimerRef.current = setTimeout(() => {
      const prev = prevStateRef.current;
      if (prev?.effect) {
        sendEffect(prev.effect, prev.speed);
      } else {
        sendColor(prev?.color || '#ffffff');
      }
    }, 10000);
  };

  const handleSlow = () => {
    sendEffect('candlelight', 3);
  };

  const handleFin = () => {
    sendEffect('fadeout', 5);
    setTimeout(() => {
      setActiveEffect(null);
      setActiveColor('#000000');
    }, 5500);
  };

  return (
    <div className={styles.admin}>
      <header className={styles.header}>
        <h1 className={styles.title}>Euronight Light</h1>
        <div className={styles.live}>
          <span className={styles.liveDot} />
          <span>LIVE — {viewerCount} connecté{viewerCount !== 1 ? 's' : ''}</span>
        </div>
      </header>

      {/* Couleurs preset */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Couleurs</h2>
        <div className={styles.colorGrid}>
          {PRESET_COLORS.map(({ name, hex }) => (
            <button
              key={hex}
              className={`${styles.colorBtn} ${activeColor === hex && !activeEffect ? styles.colorActive : ''}`}
              style={{
                backgroundColor: hex,
                border: hex === '#000000' ? '1px solid #444' : '2px solid transparent',
              }}
              onClick={() => sendColor(hex)}
              title={name}
            />
          ))}
        </div>
      </section>

      {/* Couleur personnalisée */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Couleur personnalisée</h2>
        <div className={styles.customRow}>
          <input
            type="color"
            value={customColor}
            onChange={(e) => { setCustomColor(e.target.value); setHexInput(e.target.value); }}
            className={styles.colorPicker}
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexInput(e.target.value)}
            className={styles.hexInput}
            placeholder="#ffffff"
            maxLength={7}
          />
          <div className={styles.colorPreview} style={{ backgroundColor: customColor }} />
          <button className={styles.applyBtn} onClick={() => sendColor(customColor)}>
            Appliquer
          </button>
        </div>
      </section>

      {/* Effets */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Effets</h2>
        <div className={styles.speedRow}>
          <label className={styles.sliderLabel}>Vitesse : {speed}</label>
          <input
            type="range" min={1} max={10} value={speed}
            onChange={(e) => handleSpeedChange(Number(e.target.value))}
            className={styles.slider}
          />
        </div>
        <div className={styles.effectGrid}>
          {EFFECTS.map(({ id, label, emoji }) => (
            <button
              key={id}
              className={`${styles.effectBtn} ${activeEffect === id ? styles.effectActive : ''}`}
              onClick={() => activeEffect === id ? stopEffect() : sendEffect(id)}
            >
              <span className={styles.effectEmoji}>{emoji}</span>
              <span className={styles.effectLabel}>{label}</span>
            </button>
          ))}
        </div>
        {activeEffect && (
          <button className={styles.stopBtn} onClick={stopEffect}>
            ⏹ Stopper l'effet
          </button>
        )}
      </section>

      {/* Luminosité */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Luminosité : {Math.round(brightness * 100)}%</h2>
        <input
          type="range" min={0} max={1} step={0.01} value={brightness}
          onChange={(e) => handleBrightnessChange(Number(e.target.value))}
          className={styles.slider}
        />
      </section>

      {/* Moments spéciaux */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Moments spéciaux</h2>
        <div className={styles.momentsGrid}>
          <button className={styles.momentBtn} onClick={handleFlash}>⚡ FLASH</button>
          <button className={styles.momentBtn} onClick={handleEntreeMaries}>💍 ENTRÉE MARIÉS</button>
          <button className={styles.momentBtn} onClick={handlePremiereDanse}>💃 PREMIÈRE DANSE</button>
          <button className={styles.momentBtn} onClick={handleBouquet}>🎉 BOUQUET</button>
          <button className={styles.momentBtn} onClick={handleSlow}>🕯️ SLOW</button>
          <button className={`${styles.momentBtn} ${styles.finBtn}`} onClick={handleFin}>🏁 FIN</button>
        </div>
      </section>

      {/* QR Code */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>QR Code spectateurs</h2>
        <div className={styles.qrBox}>
          <QRCodeSVG value={viewerUrl} size={160} bgColor="#ffffff" fgColor="#000000" />
          <p className={styles.qrUrl}>{viewerUrl}</p>
          <button className={styles.qrFullBtn} onClick={() => setShowQR(true)}>
            Plein écran
          </button>
        </div>
      </section>

      {/* Modal QR plein écran */}
      {showQR && (
        <div className={styles.modal} onClick={() => setShowQR(false)}>
          <QRCodeSVG value={viewerUrl} size={320} bgColor="#ffffff" fgColor="#000000" />
          <p className={styles.qrUrlLarge}>{viewerUrl}</p>
          <p className={styles.tapClose}>Toucher pour fermer</p>
        </div>
      )}
    </div>
  );
}
