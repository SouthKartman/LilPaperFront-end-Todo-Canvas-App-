// src/components/ColorPicker/ColorPicker.tsx
import React, { useState, useRef } from 'react';
import * as utils from './colorUtils';
import './ColorPicker.css';

interface ColorPickerProps {
  value: string;
  onChange: (hexColor: string) => void;
}

type ColorMode = 'HEX' | 'RGB' | 'HSV' | 'CMYK';

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [hsva, setHsva] = useState<utils.HSVA>(() => utils.RGBAtoHSVA(utils.hextoRGB(value)));
  const [mode, setMode] = useState<ColorMode>('HEX');
  const saturationRef = useRef<HTMLDivElement>(null);


 const currentHexInState = utils.RGBtoHex(utils.HSVAtoRGBA(hsva));
  if (value.toLowerCase() !== currentHexInState.toLowerCase()) {
    // Проверяем, что входящее значение не превращается в ту же самую графику
    const incomingHsva = utils.RGBAtoHSVA(utils.hextoRGB(value));
    // Если изменился именно оттенок или кардинально цвет — обновляем
    if (incomingHsva.h !== hsva.h || incomingHsva.s !== hsva.s || incomingHsva.v !== hsva.v || incomingHsva.a !== hsva.a) {
      // Но если это чистый белый/черный/серый цвет, мы сохраняем старый оттенок (Hue)
      if (incomingHsva.s === 0 || incomingHsva.v === 0) {
        incomingHsva.h = hsva.h; 
      }
      setHsva(incomingHsva);
    }
  }

  const rgba = utils.HSVAtoRGBA(hsva);
  

  // Обновление цвета из палитры Saturation/Value
  const handleSaturationMove = (event: React.MouseEvent | MouseEvent) => {
    if (!saturationRef.current) return;
    const rect = saturationRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));

    const s = Math.round((x / rect.width) * 100);
    const v = Math.round((1 - y / rect.height) * 100);

    const nextHsva = ({ ...hsva, s, v });
    setHsva(nextHsva);
    onChange(utils.RGBtoHex(utils.HSVAtoRGBA(nextHsva)));
  };

  const handleSaturationMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    handleSaturationMove(event);
    const handleMouseMove = (e: MouseEvent) => handleSaturationMove(e);
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Изменение оттенка (Hue)
  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextHsva = ({ ...hsva, h: parseInt(e.target.value, 10) });
    setHsva(nextHsva);
    onChange(utils.RGBtoHex(utils.HSVAtoRGBA(nextHsva)));
  };

  // Изменение прозрачности (Alpha)
  const handleAlphaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const a = parseFloat(event.target.value);
    const nextHsva = { ...hsva, a};
    setHsva(nextHsva);
    onChange(utils.RGBtoHex(utils.HSVAtoRGBA(nextHsva)));
  };

  // Активация встроенной пипетки браузера (EyeDropper API)
  const handleEyeDropper = async () => {
    if (!('EyeDropper' in window)) {
      alert('Ваш браузер не поддерживает инструмент Пипетка');
      return;
    }
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      // Возвращает HEX цвета пикселя
      onChange(result.sRGBHex); 
    } catch (e) {
      console.log('Выбор цвета отменен');
    }
  };

  const pureHueBg = utils.RGBtoHex(utils.HSVAtoRGBA({ h: hsva.h, s: 100, v: 100, a: 1 }));
  const cmyk = utils.rgbaToCmyka(rgba);

  return (
    <div className="color-picker-container">
      {/* Палитра */}
      <div className='saturation-board'
           ref = {saturationRef}
           style={{backgroundColor:pureHueBg}}
           onMouseDown={handleSaturationMouseDown}>
           <div className='gradient-white'/>
           <div className='gradient-black'/>
           <div 
          className="board-pointer"
          style={{
            left: `${hsva.s}%`,
            top: `${100 - hsva.v}%`
          }}
        />
      </div>


    {/* <div className='board-pointer'
        style={{
            left: `${hsva.s}%`,
            top: `${100-hsva.v}%`
        }}></div> */}

    <div style={{marginTop: `10px`, color: `fff`, textAlign:`center`}}>
        {value.toUpperCase()}
    </div>
      {/* Контролы: Пипетка + Слайдеры */}
      <div className="controls-row">
        <button className="eye-dropper-btn" onClick={handleEyeDropper} title="Пипетка">
          ✒️
        </button>
        <div className="sliders-group">
          {/* Слайдер Оттенка */}
          <input type="range" min="0" max="360" value={hsva.h} onChange={handleHueChange} className="slider-hue" />
          {/* Слайдер Прозрачности */}
          <div className="alpha-slider-wrap" style={{ '--alpha-bg': utils.RGBtoHex({ ...rgba, a: 1 }) } as React.CSSProperties}>
            <input type="range" min="0" max="1" step="0.01" value={rgba.a} onChange={handleAlphaChange} className="slider-alpha" />
          </div>
        </div>
      </div>

      {/* Блок переключения отображения данных */}
      <div className="mode-selector">
        {(['HEX', 'RGB', 'HSV', 'CMYK'] as ColorMode[]).map(m => (
          <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
            {m}
          </button>
        ))}
      </div>

      {/* Динамические поля ввода */}
      <div className="inputs-floor">
        {mode === 'HEX' && (
          <input type="text" value={value.toUpperCase()} onChange={(e) => /^#[0-9A-F]{6,8}$/i.test(e.target.value) && onChange(e.target.value)} />
        )}
        {mode === 'RGB' && (
          <>
            <label>R<input type="number" min="0" max="255" value={rgba.r} onChange={e =>{const nextRgba = {...rgba, r: +e.target.value}; setHsva(utils.RGBAtoHSVA(nextRgba)); onChange(utils.RGBtoHex(nextRgba))}} /></label>
            <label>G<input type="number" min="0" max="255" value={rgba.g} onChange={e =>{const nextRgba = {...rgba, r: +e.target.value}; setHsva(utils.RGBAtoHSVA(nextRgba)); onChange(utils.RGBtoHex(nextRgba))}} /></label>
            <label>B<input type="number" min="0" max="255" value={rgba.b} onChange={e =>{const nextRgba = {...rgba, r: +e.target.value}; setHsva(utils.RGBAtoHSVA(nextRgba)); onChange(utils.RGBtoHex(nextRgba))}} /></label>
            <label>A<input type="number" min="0" max="1" step="0.1" value={rgba.a} onChange = { e =>{const nextRgba = {...rgba, r: +e.target.value}; setHsva(utils.RGBAtoHSVA(nextRgba)); onChange(utils.RGBtoHex(nextRgba))}} /></label>
          </>
        )}
        {mode === 'HSV' && (
          <>
            <label>H<input type="number" value={hsva.h} onChange={e => onChange(utils.RGBtoHex(utils.HSVAtoRGBA({ ...hsva, h: +e.target.value })))} /></label>
            <label>S<input type="number" value={hsva.s} onChange={e => onChange(utils.RGBtoHex(utils.HSVAtoRGBA({ ...hsva, s: +e.target.value })))} /></label>
            <label>V<input type="number" value={hsva.v} onChange={e => onChange(utils.RGBtoHex(utils.HSVAtoRGBA({ ...hsva, v: +e.target.value })))} /></label>
          </>
        )}
        {mode === 'CMYK' && (
          <>
            <label>C<input type="number" value={cmyk.c} onChange={e => onChange(utils.RGBtoHex(utils.cmykaToRgba({ ...cmyk, c: +e.target.value })))} /></label>
            <label>M<input type="number" value={cmyk.m} onChange={e => onChange(utils.RGBtoHex(utils.cmykaToRgba({ ...cmyk, m: +e.target.value })))} /></label>
            <label>Y<input type="number" value={cmyk.y} onChange={e => onChange(utils.RGBtoHex(utils.cmykaToRgba({ ...cmyk, y: +e.target.value })))} /></label>
            <label>K<input type="number" value={cmyk.k} onChange={e => onChange(utils.RGBtoHex(utils.cmykaToRgba({ ...cmyk, k: +e.target.value })))} /></label>
          </>
        )}
      </div>
    </div>
  );
}
