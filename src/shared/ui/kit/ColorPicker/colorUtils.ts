export interface RGBA {r: number; g:number; b:number; a:number}
export interface HSVA {h:number, s:number; v:number; a:number}
export interface CMYKA {c:number, m:number; y:number; k:number; a:number}

// 1.Hex to RGBA

export function hextoRGB(hex: string): RGBA
{
    

    if(!hex || typeof hex !== 'string')
    {
        return {r: 0, g: 0, b:0, a:1}
    }

    let c = hex.replace('#','');

    if (c.length === 3 || c.length === 4)
    {
        c = c.split('').map(x => x + x).join('');
    }
    const num = parseInt(c,16);
    const hasAlpha = c.length === 8;

    return {
        r: (num >> (hasAlpha ? 24 : 16)) & 255,
        g: (num >> (hasAlpha ? 16 : 8)) & 255,
        b: (num >> (hasAlpha ? 8 : 0)) & 255,
        a: hasAlpha ? Math.round(((num & 255) / 255)* 100) / 100 : 1
    };
}

export function RGBtoHex({r,g,b,a}:RGBA) : string {
    const toHex = (x:number) => Math.max(0,Math.min(255,x)).toString(16).padStart(2,'0');
    const alphaHex = a >= 1 ? `` : toHex(Math.round(a*255));
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;
}

// 2. RGBA to HSVA

export function RGBAtoHSVA({r,g,b,a}:RGBA):HSVA
{
    const r01 = r/255, g01 = g/255,b01 = b / 255;
    const max = Math.max(r01,b01,g01), min = Math.min (r01,g01,b01);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : (d/max) * 100;
    const v = max * 100;

    if (max !== min){
        if (max === r01) h = (g01 - b01) / d + (g01 < b01 ? 6 : 0);
        else if (max === g01) h = (b01 - r01) / d+2;
        else h = (r01 - g01) / d+4;
        h /= 6;
    };
    return {h: Math.round(h * 360), s: Math.round(s), v: Math.round(v), a};
}

// HSVAtoRGBA

export function HSVAtoRGBA({h,s,v,a}: HSVA) : RGBA
{
    const s01 = s / 100, v01 = v / 100;
    const k = (n: number) => (n + h / 60) % 6;
    const f = (n: number) => v01 * (1 - s01 * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    return {
        r: Math.round(255 * f(5)),
        g: Math.round(255 * f(3)),
        b: Math.round(255 * f(1)),
        a
  };
}

// 3. RGBAtoCMYKA

export function rgbaToCmyka({ r, g, b, a }: RGBA): CMYKA {
  const r01 = r / 255, g01 = g / 255, b01 = b / 255;
  const k = 1 - Math.max(r01, g01, b01);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100, a };
  const c = Math.round(((1 - r01 - k) / (1 - k)) * 100);
  const m = Math.round(((1 - g01 - k) / (1 - k)) * 100);
  const y = Math.round(((1 - b01 - k) / (1 - k)) * 100);
  return { c, m, y, k: Math.round(k * 100), a };
}

export function cmykaToRgba({ c, m, y, k, a }: CMYKA): RGBA {
  const c01 = c / 100, m01 = m / 100, y01 = y / 100, k01 = k / 100;
  return {
    r: Math.round(255 * (1 - c01) * (1 - k01)),
    g: Math.round(255 * (1 - m01) * (1 - k01)),
    b: Math.round(255 * (1 - y01) * (1 - k01)),
    a
  };
}