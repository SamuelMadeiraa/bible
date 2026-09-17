// Motor de renderização compartilhado entre o operador e a tela de projeção.
// Tudo é proporcional ao tamanho do canvas, então a mesma "slide" fica idêntica
// na prévia (pequena) e na projeção (tela cheia).
(function (g) {
  const fontStr = (size, weight, font) => `${weight} ${size}px "${font}"`;
  const norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const caixa = (t, st) => (st.upper ? t.toLocaleUpperCase('pt-BR') : t);
  const pesoDestaque = st => (st.hlBold ? Math.max(700, +st.weight) : st.weight);

  function espacamento(ctx, st, size) {
    if ('letterSpacing' in ctx) ctx.letterSpacing = (st.ls * size / 100) + 'px';
  }

  function quebrarLinhas(ctx, tks, cores, size, maxW, st) {
    espacamento(ctx, st, size);
    ctx.font = fontStr(size, st.weight, st.font);
    const esp = ctx.measureText(' ').width;
    const linhas = [];
    let atual = [], larg = 0;
    tks.forEach((t, i) => {
      ctx.font = fontStr(size, cores[i] ? pesoDestaque(st) : st.weight, st.font);
      const w = ctx.measureText(caixa(t, st)).width;
      if (atual.length && larg + esp + w > maxW) { linhas.push({ items: atual, w: larg }); atual = []; larg = 0; }
      larg += (atual.length ? esp : 0) + w;
      atual.push({ i, t, w });
    });
    if (atual.length) linhas.push({ items: atual, w: larg });
    return { linhas, esp };
  }

  // Desenha o texto + referência. Retorna as caixas das palavras (para clique) e o tamanho usado.
  function drawText(ctx, W, H, slide) {
    const st = slide.style;
    const tks = slide.text.tokens || [];
    const cores = slide.text.colors || [];
    const ref = (slide.text.ref || '').trim();
    const unit = Math.min(W, H) / 1080;
    const mx = W * st.margin / 100;
    const my = H * st.margin / 100 * (W > H ? 1 : 0.8);
    const maxW = (W - 2 * mx) * st.width / 100;
    const areaH = H * st.area / 100 - my;
    const lh = st.lh / 100;
    const refK = st.refSize / 100;
    const alturaTotal = (size, nl) => nl * size * lh + (ref ? size * 0.35 + size * refK * 1.1 : 0);

    let size = st.size * unit;
    if (st.auto && tks.length) {
      let lo = 20 * unit, hi = 260 * unit;
      for (let k = 0; k < 16; k++) {
        const mid = (lo + hi) / 2;
        const { linhas } = quebrarLinhas(ctx, tks, cores, mid, maxW, st);
        if (alturaTotal(mid, linhas.length) <= areaH) lo = mid; else hi = mid;
      }
      size = Math.floor(lo);
    }
    const { linhas, esp } = quebrarLinhas(ctx, tks, cores, size, maxW, st);
    const total = alturaTotal(size, linhas.length);

    let top;
    if (st.valign === 'top') top = my;
    else if (st.valign === 'middle') top = (H - total) / 2;
    else top = H - my - total;

    const blocoX = st.align === 'left' ? mx : st.align === 'right' ? W - mx - maxW : (W - maxW) / 2;
    const xLinha = w => st.align === 'left' ? blocoX : st.align === 'right' ? blocoX + maxW - w : blocoX + (maxW - w) / 2;

    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    if (st.shadow) {
      ctx.shadowColor = hexA(st.shadowColor, 0.75);
      ctx.shadowBlur = size * 0.18;
      ctx.shadowOffsetX = size * 0.03;
      ctx.shadowOffsetY = size * 0.04;
    }
    const caixas = [];
    const asc = size * 0.82;
    linhas.forEach((ln, li) => {
      let x = xLinha(ln.w);
      const base = top + asc + li * size * lh + (size * lh - size) / 2;
      ln.items.forEach(it => {
        const cor = cores[it.i];
        const txt = caixa(it.t, st);
        ctx.font = fontStr(size, cor ? pesoDestaque(st) : st.weight, st.font);
        if (cor) {
          // pontuação fica na cor do texto; só a palavra recebe o destaque
          const m = txt.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
          let px = x;
          [[m[1], st.textColor], [m[2], cor], [m[3], st.textColor]].forEach(([parte, c]) => {
            if (!parte) return;
            ctx.fillStyle = c;
            ctx.fillText(parte, px, base);
            px += ctx.measureText(parte).width;
          });
        } else {
          ctx.fillStyle = st.textColor;
          ctx.fillText(txt, x, base);
        }
        caixas.push({ i: it.i, x, y: base - asc, w: it.w, h: size * lh });
        x += it.w + esp;
      });
    });

    if (ref) {
      const rs = size * refK;
      espacamento(ctx, st, rs);
      ctx.font = fontStr(rs, st.weight, st.font);
      const r = caixa(ref, st);
      const rw = ctx.measureText(r).width;
      const ry = top + linhas.length * size * lh + size * 0.35 + rs * 0.82;
      ctx.fillStyle = st.refColor;
      ctx.fillText(r, xLinha(rw), ry);
    }
    ctx.restore();
    return { caixas, size: size / unit };
  }

  function drawBackground(ctx, W, H, bg, img) {
    ctx.save();
    if (bg.type === 'image' && img && img.naturalWidth) {
      const esc = Math.max(W / img.naturalWidth, H / img.naturalHeight) * bg.zoom / 100;
      const dw = img.naturalWidth * esc, dh = img.naturalHeight * esc;
      const dx = (W - dw) * bg.fx / 100, dy = (H - dh) * bg.fy / 100;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      if (bg.blur > 0) ctx.filter = `blur(${bg.blur * Math.min(W, H) / 1080}px)`;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.filter = 'none';
    } else if (bg.type === 'gradient') {
      const a = (bg.ang - 90) * Math.PI / 180;
      const r = Math.abs(W * Math.cos(a)) / 2 + Math.abs(H * Math.sin(a)) / 2;
      const cx = W / 2, cy = H / 2;
      const gr = ctx.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      gr.addColorStop(0, bg.grad1);
      gr.addColorStop(1, bg.grad2);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = bg.type === 'image' ? '#000' : bg.color;
      ctx.fillRect(0, 0, W, H);
    }
    if (bg.overlay > 0) {
      ctx.fillStyle = `rgba(0,0,0,${bg.overlay / 100})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  // Desenha a slide completa (fundo + texto) respeitando o modo.
  function drawSlide(ctx, W, H, slide, img) {
    ctx.clearRect(0, 0, W, H);
    if (slide.mode === 'black') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return { caixas: [] }; }
    drawBackground(ctx, W, H, slide.bg, img);
    if (slide.mode === 'clear') return { caixas: [] };
    return drawText(ctx, W, H, slide);
  }

  const fontesCarregadas = new Set();
  async function ensureFonts(st) {
    const pedidos = [fontStr(80, st.weight, st.font), fontStr(80, pesoDestaque(st), st.font)]
      .filter(f => !fontesCarregadas.has(f));
    if (!pedidos.length) return;
    try {
      await Promise.all(pedidos.map(f => document.fonts.load(f)));
      pedidos.forEach(f => fontesCarregadas.add(f));
    } catch (e) { /* segue com a fonte de fallback */ }
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  }

  g.Engine = { drawText, drawBackground, drawSlide, ensureFonts, norm, hexA };
})(window);
