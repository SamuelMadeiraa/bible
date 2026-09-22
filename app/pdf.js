// PDF em imagens (tela Início): cada página do PDF vira uma
// imagem Full HD; o operador marca as que quer e cria um preset com elas (ou só guarda as imagens).
// O PDF é desenhado aqui mesmo com o PDF.js; as imagens são gravadas pelo processo principal.
(function () {
  if (!(ponte && ponte.salvarImagensPdf)) return;
  $('ferramentaPdf').hidden = false;
  $('btnPdfPreset').hidden = false;
  $('btnPdfHero').hidden = false;

  const LARGURA = 1920;            // as páginas saem com esta largura (Full HD), ou menores se forem "em pé"
  const ALTURA = 1080;
  const MINIATURA = 360;
  let paginas = [];                // { n, blob, url, marcada }
  let nomePdf = '';
  let leitura = 0;                 // muda a cada PDF: uma leitura antiga para de trabalhar
  let criado = null;               // { preset, pasta } do último que foi salvo

  // o PDF.js só é carregado quando a ferramenta é usada
  let carregando = null;
  function carregarPdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (carregando) return carregando;
    const script = src => new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => falha(new Error('Não consegui carregar o leitor de PDF'));
      document.head.appendChild(s);
    });
    const base = '../node_modules/pdfjs-dist/build/';
    // o "worker" roda nesta mesma tela (pdfjsWorker): não depende de Web Worker em file://
    carregando = script(base + 'pdf.worker.min.js').then(() => script(base + 'pdf.min.js')).then(() => window.pdfjsLib);
    carregando.catch(() => { carregando = null; });
    return carregando;
  }

  const mostrar = qual => ['pdfInicio', 'pdfLendo', 'pdfPaginas', 'pdfPronto'].forEach(id => { $(id).hidden = id !== qual; });
  function limpar() {
    paginas.forEach(p => URL.revokeObjectURL(p.url));
    paginas = [];
    $('pdfGrade').innerHTML = '';
    $('pdfErro').textContent = '';
  }
  function abrirFerramenta() {
    leitura++;
    limpar();
    criado = null;
    mostrar('pdfInicio');
    abrir('modalPdf');
  }

  async function escolher() {
    const caminho = await ponte.escolherArquivo('pdf');
    if (!caminho) return;
    let dados;
    try { dados = await ponte.lerArquivo(caminho); }
    catch (e) { return toast('Não consegui ler o arquivo: ' + limparErro(e)); }
    ler(dados, caminho.split(/[\\/]/).pop());
  }
  const limparErro = e => String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

  async function ler(dados, nomeArquivo) {
    const minha = ++leitura;
    limpar();
    nomePdf = nomeArquivo.replace(/\.pdf$/i, '');
    mostrar('pdfLendo');
    $('pdfLendoTxt').textContent = 'Abrindo o PDF…';
    $('pdfBarra').style.width = '0';
    let doc;
    try {
      const pdfjs = await carregarPdfjs();
      doc = await pdfjs.getDocument({
        data: new Uint8Array(dados),
        isEvalSupported: false,          // nunca executa código vindo do PDF
        standardFontDataUrl: '../node_modules/pdfjs-dist/standard_fonts/',
      }).promise;
    } catch (e) {
      if (minha !== leitura) return;
      mostrar('pdfInicio');
      const senha = e && e.name === 'PasswordException';
      return toast(senha ? 'Este PDF tem senha: abra, tire a senha e tente de novo' : 'Não consegui abrir este PDF');
    }

    const total = doc.numPages;
    $('pdfArquivo').textContent = nomeArquivo;
    $('pdfNome').value = nomePdf.slice(0, 60);
    for (let n = 1; n <= total; n++) {
      if (minha !== leitura) { doc.destroy(); return; }
      $('pdfLendoTxt').textContent = `Transformando a página ${n} de ${total} em imagem…`;
      try {
        const blob = await desenhar(await doc.getPage(n));
        paginas.push({ n, blob, url: URL.createObjectURL(blob), marcada: true });
      } catch (e) {
        toast(`A página ${n} não pôde ser convertida e ficou de fora`);
      }
      $('pdfBarra').style.width = (n / total * 100) + '%';
    }
    doc.destroy();
    if (minha !== leitura) return;
    if (!paginas.length) { mostrar('pdfInicio'); return toast('Nenhuma página pôde ser convertida'); }
    montarGrade();
    mostrar('pdfPaginas');
    $('pdfNome').focus();
    $('pdfNome').select();
  }

  // página inteira dentro de 1920×1080 (sem cortar), fundo branco como no PDF, em JPEG
  async function desenhar(pagina) {
    const v1 = pagina.getViewport({ scale: 1 });
    const escala = Math.min(LARGURA / v1.width, ALTURA / v1.height);
    const vp = pagina.getViewport({ scale: escala });
    const cv = document.createElement('canvas');
    cv.width = Math.round(vp.width);
    cv.height = Math.round(vp.height);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    await pagina.render({ canvasContext: ctx, viewport: vp }).promise;
    pagina.cleanup();
    const blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.92));
    cv.width = cv.height = 0;
    if (!blob) throw new Error('imagem vazia');
    return blob;
  }

  function montarGrade() {
    const grade = $('pdfGrade');
    grade.innerHTML = '';
    paginas.forEach(p => {
      const l = document.createElement('label');
      l.className = 'pdf-pag' + (p.marcada ? ' on' : '');
      l.innerHTML = `<img src="${p.url}" alt="" loading="lazy" width="${MINIATURA}"><span><input type="checkbox"${p.marcada ? ' checked' : ''}>Página ${p.n}</span>`;
      l.querySelector('input').onchange = e => { p.marcada = e.target.checked; l.classList.toggle('on', p.marcada); contar(); };
      grade.appendChild(l);
    });
    contar();
  }
  function contar() {
    const n = paginas.filter(p => p.marcada).length;
    $('pdfContagem').textContent = `${paginas.length} ${paginas.length === 1 ? 'página' : 'páginas'} • ${n} ${n === 1 ? 'escolhida' : 'escolhidas'}`;
    $('pdfCriar').disabled = $('pdfSoImagens').disabled = !n;
  }
  function marcarTodas(sim) { paginas.forEach(p => { p.marcada = sim; }); montarGrade(); }

  // mesmo id que a operação daria para o arquivo (roteiro.js)
  function idDe(caminho) {
    let h = 5381;
    for (let i = 0; i < caminho.length; i++) h = ((h << 5) + h + caminho.charCodeAt(i)) | 0;
    return 'm' + (h >>> 0).toString(36) + caminho.length.toString(36);
  }

  async function salvar(comPreset) {
    const escolhidas = paginas.filter(p => p.marcada);
    if (!escolhidas.length) return;
    carregarPresets();
    const nome = $('pdfNome').value.trim() || nomePdf || 'PDF';
    if (comPreset && presets.some(p => p.nome.toLowerCase() === nome.toLowerCase())) {
      return ($('pdfErro').textContent = `Já existe um preset chamado “${nome}”. Escolha outro nome.`);
    }
    $('pdfErro').textContent = '';
    $('pdfCriar').disabled = $('pdfSoImagens').disabled = true;
    const digitos = String(paginas.length).length;
    let r;
    try {
      const imagens = await Promise.all(escolhidas.map(async p => ({
        nome: `${nome} - pagina ${String(p.n).padStart(digitos, '0')}.jpg`,
        dados: await p.blob.arrayBuffer(),
      })));
      r = await ponte.salvarImagensPdf(nome, imagens);
    } catch (e) {
      $('pdfErro').textContent = 'Não consegui salvar as imagens: ' + limparErro(e);
      contar();
      return;
    }

    criado = { pasta: r.pasta, preset: null };
    if (comPreset) {
      const usados = new Set();
      const itens = r.caminhos.map(caminho => {
        let id = idDe(caminho);
        while (usados.has(id)) id = idDe(caminho) + Math.random().toString(36).slice(2, 5);
        usados.add(id);
        return { id, tipo: 'imagem', caminho, nome: caminho.split(/[\\/]/).pop(), dur: null };
      });
      const agora = Date.now();
      const p = { id: novoId(), nome, criado: agora, alterado: agora, itens };
      presets.unshift(p);
      if (!salvarPresets()) { contar(); return; }
      criado.preset = p;
      montarPresets();
      montarBases();
      status();
    }

    const n = r.caminhos.length, imgs = `${n} ${n === 1 ? 'imagem' : 'imagens'}`;
    $('pdfProntoTxt').textContent = comPreset ? `Preset “${nome}” criado com ${imgs}` : `${imgs} ${n === 1 ? 'salva' : 'salvas'}`;
    $('pdfProntoSub').textContent = 'As imagens ficaram na pasta ' + r.pasta;
    $('pdfUsar').hidden = !comPreset;
    mostrar('pdfPronto');
    leitura++;
    limpar();
  }

  // ---------- ligações ----------
  ACOES.pdf = abrirFerramenta;
  $('btnPdfPreset').onclick = abrirFerramenta;
  $('btnPdfHero').onclick = abrirFerramenta;
  $('pdfEscolher').onclick = escolher;
  $('pdfOutro').onclick = escolher;
  $('pdfNovo').onclick = () => { criado = null; mostrar('pdfInicio'); };
  $('pdfTodas').onclick = () => marcarTodas(true);
  $('pdfNenhuma').onclick = () => marcarTodas(false);
  $('pdfCriar').onclick = () => salvar(true);
  $('pdfSoImagens').onclick = () => salvar(false);
  $('pdfNome').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); salvar(true); } });
  $('pdfVerPasta').onclick = () => criado && ponte.mostrarPasta('arquivo', criado.pasta);
  $('pdfUsar').onclick = () => {
    if (!criado || !criado.preset) return;
    $('modalPdf').classList.remove('on');
    usarPreset(criado.preset);
  };
  // fechar a janela no meio da leitura para o trabalho
  new MutationObserver(() => { if (!$('modalPdf').classList.contains('on')) { leitura++; limpar(); } })
    .observe($('modalPdf'), { attributes: true, attributeFilter: ['class'] });

  // arrastar um PDF do Windows para a janela
  const inicio = $('pdfInicio');
  const modal = $('modalPdf');
  modal.addEventListener('dragover', e => { e.preventDefault(); inicio.classList.add('arrastando'); });
  modal.addEventListener('dragleave', e => { if (e.target === inicio || !modal.contains(e.relatedTarget)) inicio.classList.remove('arrastando'); });
  modal.addEventListener('drop', async e => {
    e.preventDefault();
    inicio.classList.remove('arrastando');
    const f = [...(e.dataTransfer.files || [])].find(x => /\.pdf$/i.test(x.name));
    if (!f) return toast('Arraste um arquivo PDF');
    ler(await f.arrayBuffer(), f.name);
  });
})();
