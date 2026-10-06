// Dibuja las marcas directamente sobre el canvas del gráfico (primitive de lightweight-charts),
// así se mueven y escalan solas al hacer zoom/scroll.
//
// Dos capas: zonas (detrás de las velas) y marcas (encima).
// Datos que recibe en update():
//   structure / ext : resultado de detectStructure (interna / externa)
//   zones           : FVG y Order Blocks sin mitigar
//   eq, sweeps      : liquidez
//   htf             : niveles de temporalidades mayores [{ color, lines:[{price,label,dash}] }]

export const COLORS = {
  up: '#2ebd85',
  down: '#f6465d',
  bos: '#6ea8fe',
  choch: '#f5a524',
  dot: '#8b95a5',
  eq: '#94a3b8',
  sweep: '#f472b6',
};
const FONT = '600 11px -apple-system, "Segoe UI", Roboto, sans-serif';
const FONT_BIG = '700 12px -apple-system, "Segoe UI", Roboto, sans-serif';
const FONT_SMALL = '600 10px -apple-system, "Segoe UI", Roboto, sans-serif';

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Texto con fondo "píldora" (para la estructura externa). */
function pill(ctx, text, cx, baseY, color) {
  const w = ctx.measureText(text).width + 8;
  const x = cx - w / 2;
  ctx.fillStyle = 'rgba(11, 15, 20, 0.86)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, baseY - 12, w, 16, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, baseY);
}

class ZonesRenderer {
  constructor(o) { this.o = o; }
  draw(target) {
    const o = this.o;
    if (!o.chart || !o.series || !o.data?.zones?.length) return;
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const ts = o.chart.timeScale();
      ctx.font = FONT_SMALL;
      ctx.textAlign = 'left';
      for (const z of o.data.zones) {
        const x1 = ts.timeToCoordinate(z.time);
        const y1 = o.series.priceToCoordinate(z.top);
        const y2 = o.series.priceToCoordinate(z.bottom);
        if (x1 === null || y1 === null || y2 === null) continue;
        const color = z.dir === 'bull' ? COLORS.up : COLORS.down;
        const isOb = z.kind === 'ob';
        const w = mediaSize.width - x1;
        if (w <= 0) continue;
        const h = Math.max(1, y2 - y1);
        ctx.fillStyle = rgba(color, isOb ? 0.2 : 0.12);
        ctx.fillRect(x1, y1, w, h);
        ctx.strokeStyle = rgba(color, isOb ? 0.85 : 0.55);
        ctx.lineWidth = isOb ? 1.4 : 1;
        ctx.setLineDash(isOb ? [] : [3, 3]);
        ctx.strokeRect(x1 + 0.5, y1 + 0.5, w, h);
        ctx.setLineDash([]);
        ctx.fillStyle = rgba(color, 1);
        ctx.fillText(isOb ? 'OB' : 'FVG', Math.max(x1 + 3, 3), y1 + 10);
      }
    });
  }
}

class MarksRenderer {
  constructor(o) { this.o = o; }

  draw(target) {
    const o = this.o;
    if (!o.chart || !o.series || !o.data) return;
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      const ts = o.chart.timeScale();
      const W = mediaSize.width;
      const X = (t) => ts.timeToCoordinate(t);
      const Y = (p) => o.series.priceToCoordinate(p);
      ctx.textBaseline = 'alphabetic';

      this.drawHtf(ctx, W, Y);
      this.drawEq(ctx, W, X, Y);
      this.drawSweeps(ctx, X, Y);
      if (o.opts.structure) this.drawBreaks(ctx, o.data.structure, X, Y, false);
      if (o.opts.swings) this.drawPivots(ctx, o.data.structure, W, X, Y, false);
      if (o.data.ext) {
        this.drawBreaks(ctx, o.data.ext, X, Y, true);
        this.drawPivots(ctx, o.data.ext, W, X, Y, true);
      }
    });
  }

  drawHtf(ctx, W, Y) {
    const groups = this.o.data.htf || [];
    ctx.font = FONT_SMALL;
    ctx.textAlign = 'right';
    for (const g of groups) {
      for (const l of g.lines) {
        const y = Y(l.price);
        if (y === null) continue;
        ctx.strokeStyle = g.color;
        ctx.fillStyle = g.color;
        ctx.lineWidth = l.dash ? 1 : 1.4;
        ctx.setLineDash(l.dash ? [2, 4] : [8, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillText(l.label, W - 6, y - 3);
      }
    }
  }

  drawEq(ctx, W, X, Y) {
    ctx.font = FONT_SMALL;
    ctx.textAlign = 'center';
    for (const e of this.o.data.eq || []) {
      const x1 = X(e.fromTime);
      const y = Y(e.level);
      if (x1 === null || y === null) continue;
      const x2 = e.endTime !== null ? X(e.endTime) : W;
      if (x2 === null) continue;
      ctx.strokeStyle = COLORS.eq;
      ctx.fillStyle = COLORS.eq;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      ctx.setLineDash([]);
      const xm = X(e.toTime);
      ctx.fillText(e.kind, ((x1 + (xm ?? x1)) / 2), e.kind === 'EQH' ? y - 14 : y + 22);
    }
  }

  drawSweeps(ctx, X, Y) {
    ctx.font = FONT_SMALL;
    ctx.textAlign = 'center';
    for (const s of this.o.data.sweeps || []) {
      const x1 = X(s.pivotTime), x2 = X(s.time), y = Y(s.level);
      if (x1 === null || x2 === null || y === null) continue;
      ctx.strokeStyle = COLORS.sweep;
      ctx.fillStyle = COLORS.sweep;
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(s.dir === 'high' ? '▼ sweep' : '▲ sweep', x2, s.dir === 'high' ? y - 24 : y + 32);
    }
  }

  drawBreaks(ctx, res, X, Y, big) {
    if (!res) return;
    ctx.font = big ? FONT_BIG : FONT;
    for (const b of res.breaks) {
      const x1 = X(b.fromTime), x2 = X(b.time), y = Y(b.level);
      if (x1 === null || x2 === null || y === null) continue;
      const color = b.kind === 'CHoCH' ? COLORS.choch : COLORS.bos;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = big ? 2.6 : b.kind === 'CHoCH' ? 1.6 : 1.2;
      ctx.setLineDash(big || b.kind === 'CHoCH' ? [] : [5, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      ctx.setLineDash([]);
      const mid = (x1 + x2) / 2;
      if (big) {
        pill(ctx, b.kind, mid, b.dir === 'bull' ? y - 6 : y + 20, color);
      } else {
        ctx.textAlign = 'left';
        const tw = ctx.measureText(b.kind).width;
        ctx.fillText(b.kind, Math.max(mid - tw / 2, x1 + 2), b.dir === 'bull' ? y - 5 : y + 13);
      }
    }
  }

  drawPivots(ctx, res, W, X, Y, big) {
    if (!res) return;
    ctx.font = big ? FONT_BIG : FONT;
    ctx.textAlign = 'center';
    for (const p of res.pivots) {
      const x = X(p.time), y = Y(p.price);
      if (x === null || y === null || x < -20 || x > W + 20) continue;
      const isHigh = p.type === 'high';
      if (!p.label) {
        if (big) continue;
        ctx.fillStyle = COLORS.dot;
        ctx.beginPath();
        ctx.arc(x, isHigh ? y - 4 : y + 4, 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const bullish = p.label === 'HH' || p.label === 'HL';
      const color = bullish ? COLORS.up : COLORS.down;
      if (big) {
        pill(ctx, p.label, x, isHigh ? y - 16 : y + 28, color);
      } else {
        ctx.fillStyle = color;
        ctx.fillText(p.label, x, isHigh ? y - 7 : y + 16);
      }
    }
  }
}

export class StructurePrimitive {
  constructor() {
    this.data = null;
    this.opts = { swings: true, structure: true };
    this.chart = null;
    this.series = null;
    this._requestUpdate = null;
    const zones = new ZonesRenderer(this);
    const marks = new MarksRenderer(this);
    this._views = [
      { renderer: () => zones, zOrder: () => 'bottom' },
      { renderer: () => marks, zOrder: () => 'top' },
    ];
  }

  attached({ chart, series, requestUpdate }) {
    this.chart = chart;
    this.series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this.chart = this.series = this._requestUpdate = null;
  }

  paneViews() { return this._views; }

  update(data, opts) {
    this.data = data;
    if (opts) this.opts = { ...this.opts, ...opts };
    this._requestUpdate?.();
  }
}
