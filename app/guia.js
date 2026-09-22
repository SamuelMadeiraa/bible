// Guia passo a passo: ao abrir cada tela pela primeira vez, destaca cada parte e explica para que
// serve (na versão de teste, a cada abertura do app). Dá para voltar, pular e reabrir pelo botão "Guia".
(function () {
  const TESTE = !!(window.bridge && window.bridge.teste);

  const pagina = /operador/.test(location.pathname) ? 'operador' : /criador/.test(location.pathname) ? 'criador' : 'home';
  const DESLIGADO = 'blGuiaDesligado';            // "não mostrar mais ao abrir"
  const VISTO = 'blGuiaVisto:';                   // + tela: já mostrou (teste: nesta abertura; oficial: uma vez só)
  const q = s => document.querySelector(s);
  const ler = (k, area = localStorage) => { try { return area.getItem(k); } catch (e) { return null; } };
  const gravar = (k, v, area = localStorage) => { try { v == null ? area.removeItem(k) : area.setItem(k, v); } catch (e) {} };
  const areaVisto = () => { try { return TESTE ? sessionStorage : localStorage; } catch (e) { return null; } };
  const jaViu = tela => { const a = areaVisto(); return !a || !!ler(VISTO + tela, a); };
  const marcarVisto = (tela, sim) => { const a = areaVisto(); if (a) gravar(VISTO + tela, sim ? '1' : null, a); };

  // abre uma aba interna de um painel (Bíblia: nav/busca/hist • Ajustes: texto/estilo/fundo/saida)
  const aba = (bloco, nome) => () => { const b = q(`#${bloco} [data-tab="${nome}"]`); if (b && !b.classList.contains('on')) b.click(); };
  // traz para frente um painel do layout em blocos (pode estar numa aba escondida)
  function mostrarPainel(id) {
    const p = window.Layout && Layout.api && Layout.api.getPanel(id);
    if (!p) return false;
    try { p.api.setActive(); } catch (e) {}
    return true;
  }
  const NOMES_PAINEL = { biblia: 'Bíblia', previa: 'Prévia', aovivo: 'Ao vivo', comandos: 'Comandos', palavras: 'Palavras',
    roteiro: 'Roteiro', midia: 'Mídia', ajustes: 'Ajustes', musicas: 'Músicas' };

  // ======================= passos de cada tela =======================
  const PASSOS = {
    home: [
      { titulo: 'Bem-vindo ao BibleLyrics 👋',
        texto: `Este guia mostra, passo a passo, <b>cada função do app</b>. Use <kbd>→</kbd> ou <b>Próximo</b> para avançar,
          <kbd>←</kbd> para voltar e <kbd>Esc</kbd> para sair. Você pode reabrir o guia a qualquer hora pelo botão <b>Guia</b> no topo.
          <br><br>Primeiro a tela <b>Início</b>, depois a <b>Operação</b> (onde você projeta no culto).` },
      { alvo: '.blg-botao-ajuda', titulo: 'Botão Ajuda',
        texto: 'Ficou com dúvida em alguma função? Clique em <b>Ajuda</b> e passe o mouse sobre qualquer botão ou parte da tela: aparece o que ela faz. Enquanto a ajuda está ligada, nada é clicado. Clique de novo (ou <kbd>Esc</kbd>) para desligar.' },
      { alvo: '.topo-nav', titulo: 'Menu da tela Início',
        texto: 'Atalhos para as seções desta tela: <b>Ferramentas</b>, <b>Presets</b>, <b>Programação</b> e <b>Pasta e backups</b>. Clique para ir direto.' },
      { alvo: '#versao', titulo: 'Versão do app',
        texto: TESTE ? 'Mostra a versão que está aberta. Aqui aparece <b>TESTE</b>: esta é a versão de teste, com dados separados — pode mexer à vontade sem estragar a versão da igreja.'
          : 'Mostra a versão do BibleLyrics que está aberta. As atualizações chegam sozinhas: quando houver uma nova, aparece um aviso no topo.' },
      { alvo: '#btnCelularTopo', titulo: 'Celular',
        texto: 'Abre o <b>QR code</b> e a <b>senha</b> para controlar o BibleLyrics pelo celular (no mesmo Wi-Fi do computador).' },
      { alvo: '#btnOperar', titulo: 'Iniciar operação',
        texto: 'Abre a <b>tela de operação</b>, onde você escolhe versículos, monta o roteiro e coloca tudo na projeção. É a tela usada durante o culto.' },
      { alvo: '#btnCriador', titulo: 'Criar vídeo de louvor',
        texto: 'Abre o <b>criador de vídeo</b>: você escolhe a música, cola a letra, escolhe o fundo e o app gera um <b>MP4</b> com a letra sincronizada.' },
      { alvo: '#btnPdfHero', titulo: 'PDF em imagens',
        texto: 'Recebeu avisos ou fotos num <b>PDF</b>? Cada página vira uma imagem. Marque as que quer e crie um <b>preset</b> com elas, pronto para o culto.' },
      { alvo: '#stProjecao', titulo: 'Status da projeção',
        texto: 'Mostra se a <b>TV ou projetor</b> foi encontrado. Com duas telas, a projeção abre em tela cheia na segunda. Com uma só, abre em janela.' },
      { alvo: '#stRoteiro', titulo: 'Roteiro aberto',
        texto: 'Quantos eventos (versículos, avisos, vídeos, fotos…) estão no roteiro agora e qual preset está sendo editado.' },
      { alvo: '#stProg', titulo: 'Programação',
        texto: 'Mostra se o <b>pré-culto automático</b> está agendado e a que horas começa.' },
      { alvo: '#stCelular', titulo: 'Controle pelo celular',
        texto: 'Mostra quantos celulares estão conectados. O botão <b>QR code</b> mostra o código para escanear.' },
      { alvo: '.ferramentas', titulo: 'Ferramentas',
        texto: `Cartões de atalho para tudo o que o app faz: operação ao vivo, presets, playlist programada, vídeo de louvor,
          celular, <b>PDF em imagens</b>, <b>Arquivos do celular</b> (o que foi enviado pelo celular), <b>Vídeos gerados</b> e a lista de <b>atalhos do teclado</b>.` },
      { alvo: '#btnNovoPreset', titulo: 'Criar um preset',
        texto: 'Um <b>preset</b> é a sequência de um culto guardada (versículos, avisos, vídeos, fotos…). Dê um nome, escolha começar vazio ou com o roteiro atual, e ele abre na operação para você montar.' },
      { alvo: '#btnAbrirBible', titulo: 'Abrir arquivo .bible',
        texto: 'Abre um preset ou backup salvo em arquivo <b>.bible</b> — por exemplo, um culto montado em outro computador ou enviado pelo celular.' },
      { alvo: '#listaPresets', titulo: 'Seus presets',
        texto: 'Cada cartão é um culto salvo. <b>Usar no culto</b> abre o preset na operação; o lápis abre para editar, a seta salva como arquivo .bible (com as mídias) e a lixeira apaga.' },
      { alvo: '#btnPdfPreset', titulo: 'Preset de um PDF',
        texto: 'Recebeu os avisos ou as fotos num <b>PDF</b>? Aqui cada página vira uma imagem. Você marca as páginas que quer e o app cria um <b>preset</b> com elas, pronto para usar no culto. Também dá para só guardar as imagens. Dá para arrastar o PDF para a janela.' },
      { alvo: '.prog-esq', titulo: 'Playlist programada — o que passa',
        texto: 'Escolha de qual preset vêm os eventos e <b>marque</b> o que deve passar sozinho no pré-culto (testemunhos, fotos, avisos, louvores).' },
      { alvo: '.prog-dir', titulo: 'Playlist programada — horários',
        texto: `Defina <b>a que horas começa</b> o pré-culto e o <b>horário do culto</b>. No horário do culto entra a abertura que você escolher
          e daí em diante tudo fica manual. Dá para repetir a sequência e escolher quantos segundos cada foto/aviso fica.
          <b>Começar agora</b> testa na hora; <b>Agendar</b> deixa pronto. A programação só roda com a operação aberta.` },
      { alvo: '#arquivos .arq:first-child', titulo: 'Pasta do BibleLyrics',
        texto: 'Onde ficam as mídias, presets, backups, vídeos gerados e o que chega do celular. Você pode <b>abrir</b> ou <b>mudar</b> a pasta. Deixe marcado “guardar uma cópia das mídias” para o roteiro não quebrar se o arquivo original mudar de lugar.' },
      { alvo: '#arquivos .arq:last-child', titulo: 'Backup',
        texto: 'Faça um <b>backup .bible</b> de tudo (com ou sem as mídias) e <b>restaure</b> em outro computador. O backup automático diário guarda os 10 últimos.' },
      { titulo: 'Agora, a operação',
        texto: 'Pronto, você conhece a tela Início! Clique em <b>Ir para a operação</b> para continuar o guia na tela usada no culto.',
        botao: 'Ir para a operação', acao: () => { marcarVisto('operador', false); typeof operar === 'function' ? operar() : (location.href = 'operador.html'); } },
    ],

    operador: [
      { titulo: 'Tela de operação',
        texto: `Aqui você projeta durante o culto. A ideia é simples: tudo passa primeiro pela <b>Prévia</b> (só você vê)
          e, quando você aperta <kbd>Espaço</kbd>, vai para o <b>Ao vivo</b> (o que a igreja vê). Vamos ver cada parte.` },
      { alvo: '.blg-botao-ajuda', titulo: 'Botão Ajuda',
        texto: 'Ficou com dúvida em alguma função? Clique em <b>Ajuda</b> e passe o mouse sobre qualquer botão ou parte da tela: aparece o que ela faz. Enquanto a ajuda está ligada, nada é clicado. Clique de novo (ou <kbd>Esc</kbd>) para desligar.' },
      { alvo: '#selMonitor', titulo: 'Escolher a tela da projeção',
        texto: 'Escolha em qual monitor (TV ou projetor) a projeção vai aparecer.' },
      { alvo: '#btnProjecao', titulo: 'Abrir projeção',
        texto: 'Abre a janela de projeção no monitor escolhido, em tela cheia. O indicador ao lado mostra se a projeção está aberta.' },
      { alvo: 'label:has(#chkAuto)', titulo: 'Ao vivo automático',
        texto: 'Ligado, qualquer coisa que você escolher vai <b>direto para a tela</b>, sem passar pela prévia. Bom para quem opera sozinho e com pressa; desligado é mais seguro.' },
      { alvo: 'label:has(#rTrans)', titulo: 'Transição',
        texto: 'Duração do efeito de troca entre uma tela e outra. Zero = troca seca.' },
      { alvo: '#btnInicio', titulo: 'Início', texto: 'Volta para a tela Início (presets, programação, backups).' },
      { alvo: '#btnPresets', titulo: 'Presets',
        texto: 'Abre a lista de presets: <b>usar</b> um culto salvo (substituir ou somar ao roteiro), criar um novo ou salvar o roteiro atual como preset.' },
      { alvo: '#btnJanelas', titulo: 'Layout',
        texto: `Escolha um layout pronto (<b>Padrão</b>, <b>Simples</b>, <b>Transmissão</b>) e mostre ou esconda painéis.
          Você também pode <b>arrastar a aba</b> de qualquer painel para outro lugar e guardar como “Meu layout”.` },
      { alvo: 'label:has(#chkSimples)', titulo: 'Modo simples',
        texto: 'Mostra só o essencial, com botões maiores. Ideal para quem está começando.' },
      { alvo: '#btnPng', titulo: 'PNG', texto: 'Salva a prévia como <b>imagem</b> (para postar nas redes, por exemplo). O formato — 16:9, quadrado, 4:5 ou Story — fica em Ajustes → Saída.' },
      { alvo: '#btnCelular', titulo: 'Celular',
        texto: 'Mostra o QR code e a senha para <b>controlar pelo celular</b>: passar versículos, cortar, montar o roteiro, mexer no volume e enviar fotos, vídeos e músicas.' },
      { alvo: '#btnConfig', titulo: 'Configurações',
        texto: 'Tecla de corte (Espaço/Enter), preparar o próximo evento sozinho depois do corte, passador de slides, modo simples, dicas e a lista completa de atalhos.' },

      { painel: 'biblia', alvo: '#quickRef', antes: aba('blocoBiblia', 'nav'), titulo: 'Ir para (Bíblia)',
        texto: 'Digite a referência e aperte Enter: <b>jo 3 16</b>, <b>sl 23</b>, <b>2rs 2:21</b>… Nem precisa clicar aqui: é só <b>começar a digitar</b> em qualquer lugar da tela.' },
      { painel: 'biblia', alvo: '#selLivro', antes: aba('blocoBiblia', 'nav'), titulo: 'Livro e capítulo',
        texto: 'Escolha o livro na lista e clique no número do <b>capítulo</b>.' },
      { painel: 'biblia', alvo: '#verses', antes: aba('blocoBiblia', 'nav'), titulo: 'Versículos',
        texto: `<b>Clique</b> num versículo para colocá-lo na prévia. <b>Duplo clique</b> manda direto para o ar.
          <b>Shift+clique</b> seleciona um intervalo (ex.: 16 a 18) e <b>Ctrl+clique</b> marca vários para pôr no roteiro de uma vez.
          O <b>botão direito</b> tem mais opções e dá para <b>arrastar</b> o versículo para o roteiro.` },
      { painel: 'biblia', alvo: '#blocoBiblia .tabs', antes: aba('blocoBiblia', 'busca'), titulo: 'Buscar e Histórico',
        texto: 'Em <b>Buscar</b>, procure uma palavra ou frase na Bíblia toda (ou só num testamento/livro). Em <b>Histórico</b> ficam os versículos que já foram ao ar — duplo clique repete.' },

      { painel: 'previa', alvo: '#monPrev', titulo: 'Prévia',
        texto: 'O que <b>vai</b> para a tela. Só você vê. Confira aqui antes de cortar. Dá para clicar nas palavras da prévia para destacá-las.' },
      { painel: 'aovivo', alvo: '#monLive', titulo: 'Ao vivo',
        texto: 'O que a igreja <b>está vendo agora</b>. Embaixo, o <b>cronômetro</b> mostra há quanto tempo está no ar (e quanto falta, em vídeos).' },
      { painel: 'comandos', alvo: '#btnGo', titulo: 'CORTE',
        texto: 'Coloca a prévia no ar. Atalho: <kbd>Espaço</kbd> (ou <kbd>Enter</kbd>). É o botão mais importante do app!' },
      { painel: 'comandos', alvo: '#btnPrev', titulo: 'Versículo anterior / próximo',
        texto: 'As setas passam para o versículo anterior ou próximo na prévia. Atalhos: <kbd>←</kbd> e <kbd>→</kbd>.' },
      { painel: 'comandos', alvo: '#btnAddVers', titulo: '+ Roteiro',
        texto: 'Coloca o versículo da prévia no fim do roteiro. Atalho: <kbd>Insert</kbd>.' },
      { painel: 'comandos', alvo: '#btnClear', titulo: 'Só fundo e Tela preta',
        texto: '<b>Só fundo</b> (<kbd>C</kbd> ou <kbd>Esc</kbd>) tira o texto e deixa o fundo. <b>Tela preta</b> (<kbd>B</kbd>) apaga toda a projeção.' },
      { painel: 'palavras', alvo: '#blocoPalavras', titulo: 'Palavras (destaque)',
        texto: 'As palavras do versículo aparecem aqui. <b>Clique</b> numa palavra para destacá-la com a cor escolhida em Ajustes → Texto. O destaque vai junto quando o versículo entra no roteiro.' },

      { painel: 'roteiro', alvo: '#blocoRoteiro', titulo: 'Roteiro do culto',
        texto: `A sequência do culto: versículos, avisos, vídeos, fotos, áudios e transmissões. <b>Clique</b> num evento para pôr na prévia,
          <b>duplo clique</b> para pôr no ar. Use <kbd>↓</kbd>/<kbd>↑</kbd> para andar pelo roteiro. Arraste para mudar a ordem;
          arraste arquivos do Windows para cá. <kbd>Ctrl</kbd>+<kbd>Z</kbd> desfaz uma remoção.` },
      { painel: 'roteiro', alvo: '#btnAddEvento', titulo: 'Adicionar',
        texto: 'Coloca no roteiro: o versículo da prévia, um <b>aviso</b> (texto livre), <b>vídeos/fotos/áudios</b> do computador, uma <b>transmissão ao vivo/link</b> (YouTube etc.), <b>só o fundo</b> ou <b>tela preta</b>.' },
      { painel: 'roteiro', alvo: '#btnProgramacao', titulo: 'Programação',
        texto: 'Configura o pré-culto automático e a abertura no horário do culto, direto daqui.' },
      { painel: 'roteiro', alvo: 'label:has(#pOverlay)', titulo: 'Opções do vídeo',
        texto: '<b>Versículo sobre o vídeo</b> mostra o texto por cima do vídeo que está tocando. <b>Preencher a tela</b> corta as bordas para o vídeo/foto ocupar a tela toda.' },
      { painel: 'roteiro', alvo: '#btnLimparMidia', titulo: 'Limpar', texto: 'Tira todos os eventos do roteiro (pede confirmação).' },

      { painel: 'midia', alvo: '#blocoMidia', titulo: 'Mídia (player)',
        texto: `Controla o vídeo/áudio que está no ar: tocar/pausar (<kbd>Ctrl</kbd>+<kbd>Espaço</kbd>), parar, anterior/próximo, avançar na barra e volume.
          Opções: <b>mídias em sequência</b>, <b>repetir (loop)</b>, <b>foto fica até eu trocar</b> e quantos segundos cada foto fica.` },
      { painel: 'musicas', alvo: '#blocoMusicas', titulo: 'Músicas (playlist)',
        texto: 'Uma playlist de fundo, separada do roteiro — ótima para o pré-culto. <b>Adicionar músicas</b>, tocar, pausar, pular, volume, repetir e aleatório. Dá para enviar músicas pelo celular também.' },

      { painel: 'ajustes', alvo: '#blocoAjustes', antes: aba('blocoAjustes', 'texto'), titulo: 'Ajustes → Texto',
        texto: 'Cores e palavras de <b>destaque</b> automático, editar o texto e a referência, mostrar a referência, “ACF” e números dos versículos.' },
      { painel: 'ajustes', alvo: '#blocoAjustes', antes: aba('blocoAjustes', 'estilo'), titulo: 'Ajustes → Estilo',
        texto: 'Fonte, peso, cores, sombra, maiúsculas, tamanho (ou automático), alinhamento, margens e a área do texto. <b>Restaurar estilo padrão</b> desfaz tudo.' },
      { painel: 'ajustes', alvo: '#blocoAjustes', antes: aba('blocoAjustes', 'fundo'), titulo: 'Ajustes → Fundo',
        texto: 'Fundo com <b>imagem</b> (adicione as suas, ajuste enquadramento, zoom e desfoque), <b>cor</b> ou <b>degradê</b>. “Escurecer fundo” deixa o texto mais legível.' },
      { painel: 'ajustes', alvo: '#blocoAjustes', antes: aba('blocoAjustes', 'saida'), titulo: 'Ajustes → Saída',
        texto: 'Monitores detectados, links para <b>OBS / outro PC / Smart TV</b> na mesma rede, o controle pelo celular e o formato do PNG.' },

      { titulo: 'Pronto para o culto! 🙌',
        texto: `Resumo do dia a dia:<br>1. <b>Abrir projeção</b><br>2. Abrir um <b>preset</b> (ou montar o roteiro)<br>
          3. Escolher o que vai na <b>prévia</b><br>4. <kbd>Espaço</kbd> para pôr no ar<br><br>
          Atalhos rápidos: <kbd>B</kbd> tela preta • <kbd>C</kbd> só fundo • <kbd>←</kbd><kbd>→</kbd> versículos • <kbd>↓</kbd><kbd>↑</kbd> roteiro.
          <br><br>Reabra este guia quando quiser pelo botão <b>Guia</b> no topo.`,
        fim: () => { aba('blocoBiblia', 'nav')(); aba('blocoAjustes', 'texto')(); } },
    ],

    criador: [
      { titulo: 'Criador de vídeo de louvor',
        texto: 'Aqui você transforma uma música em um <b>vídeo MP4 com a letra</b>, pronto para projetar ou postar. São 6 passos à esquerda e a sincronia embaixo da prévia.' },
      { alvo: '.passo:nth-of-type(1)', titulo: '1. Música', texto: 'Escolha o arquivo de áudio (MP3, M4A, WAV…) e escreva o nome da música.' },
      { alvo: '.passo:nth-of-type(2)', titulo: '2. Letra', texto: 'Cole a letra. Deixe uma <b>linha em branco</b> entre as estrofes: cada estrofe vira uma tela do vídeo.' },
      { alvo: '.passo:nth-of-type(3)', titulo: '3. Fundo', texto: 'Escolha o fundo, quanto escurecer e se ele tem um movimento suave.' },
      { alvo: '.passo:nth-of-type(4)', titulo: '4. Texto', texto: 'Fonte, alinhamento, tamanho, cor, maiúsculas e sombra da letra.' },
      { alvo: '.passo:nth-of-type(5)', titulo: '5. Rodapé', texto: 'Texto do rodapé, cor, <b>logo da igreja</b> e se o nome da música aparece no começo.' },
      { alvo: '.passo:nth-of-type(6)', titulo: '6. Qualidade', texto: 'Full HD 1080p (melhor) ou HD 720p (arquivo mais leve).' },
      { alvo: '.tela', titulo: 'Prévia', texto: 'Veja como o vídeo vai ficar. <b>Play</b> (ou <kbd>Espaço</kbd>) toca a música com a letra; a linha do tempo mostra onde cada estrofe entra.' },
      { alvo: '.sincronia', titulo: 'Sincronizar a letra',
        texto: `<b>Distribuir automaticamente</b> divide o tempo por igual. Para ficar perfeito, use <b>Sincronizar tocando</b>:
          a música toca e você aperta <kbd>Espaço</kbd> no começo de cada estrofe (<kbd>Backspace</kbd> volta uma).` },
      { alvo: '#btnGerar', titulo: 'Gerar vídeo MP4',
        texto: 'Gera o arquivo. No fim você pode <b>mostrar na pasta</b> ou <b>colocar direto no roteiro</b> da operação. <b>Novo</b> começa outro vídeo.' },
    ],
  };

  // ======================= estilo =======================
  const css = document.createElement('style');
  css.textContent = `
  .blg-bloqueio{position:fixed;inset:0;z-index:99990;background:transparent}
  .blg-foco{position:fixed;z-index:99991;border-radius:12px;pointer-events:none;box-shadow:0 0 0 9999px rgba(4,6,10,.74);
    outline:2px solid #5aa0ef;outline-offset:2px;transition:left .25s,top .25s,width .25s,height .25s}
  .blg-foco.vazio{left:50%!important;top:50%!important;width:0!important;height:0!important;outline:none}
  .blg-cartao{position:fixed;z-index:99992;width:370px;max-width:calc(100vw - 32px);background:#151920;color:#eeedea;
    border:1px solid #2f3642;border-radius:16px;padding:18px 20px 16px;box-shadow:0 30px 80px -10px rgba(0,0,0,.8);
    font:14px/1.55 Inter,system-ui,sans-serif;user-select:none;transition:left .25s,top .25s}
  .blg-cartao .blg-passo{font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#5aa0ef}
  .blg-cartao h3{font:800 18px/1.25 Montserrat,Inter,sans-serif;margin:6px 0 8px}
  .blg-cartao .blg-texto{color:#c8c9cd}
  .blg-cartao b{color:#eeedea}
  .blg-cartao kbd{display:inline-block;font:600 11.5px Inter,sans-serif;padding:1px 6px;margin:0 1px;border-radius:5px;background:#232a35;border:1px solid #3a4250;color:#eeedea}
  .blg-aviso{margin-top:10px;padding:8px 10px;border-radius:9px;background:rgba(255,210,63,.08);border:1px solid rgba(255,210,63,.25);color:#ffd23f;font-size:13px}
  .blg-barra{height:4px;border-radius:4px;background:#232a35;margin:14px 0 12px;overflow:hidden}
  .blg-barra i{display:block;height:100%;background:#5aa0ef;transition:width .25s}
  .blg-botoes{display:flex;align-items:center;gap:8px}
  .blg-botoes button{font:600 13.5px Inter,sans-serif;color:#eeedea;background:rgba(255,255,255,.05);border:1px solid #2f3642;border-radius:10px;padding:8px 14px;cursor:pointer}
  .blg-botoes button:hover{background:rgba(255,255,255,.1)}
  .blg-botoes .blg-prox{background:#5aa0ef;border-color:#5aa0ef;color:#06172e;margin-left:auto}
  .blg-botoes .blg-prox:hover{background:#6eaef3}
  .blg-botoes button:focus-visible{outline:2px solid #eeedea;outline-offset:2px}
  .blg-botoes .blg-pular{background:none;border:none;color:#7f8895;padding:8px 4px}
  .blg-botoes .blg-pular:hover{color:#eeedea;background:none}
  .blg-nao{display:flex;align-items:center;gap:7px;margin-top:12px;font-size:12.5px;color:#7f8895;cursor:pointer;text-transform:none;letter-spacing:0;font-weight:500}
  .blg-nao input{accent-color:#5aa0ef}
  .blg-abrir{display:inline-flex;align-items:center;gap:6px}`;
  document.head.appendChild(css);

  // ======================= motor =======================
  let passos = [], idx = 0, el = null, alvoAtual = null;

  function achar(p) {
    if (!p.alvo) return null;
    const e = typeof p.alvo === 'function' ? p.alvo() : q(p.alvo);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return r.width > 2 && r.height > 2 ? e : null;
  }

  function montar() {
    el = {
      bloqueio: Object.assign(document.createElement('div'), { className: 'blg-bloqueio' }),
      foco: Object.assign(document.createElement('div'), { className: 'blg-foco' }),
      cartao: Object.assign(document.createElement('div'), { className: 'blg-cartao' }),
    };
    el.cartao.innerHTML = `<div class="blg-passo"></div><h3></h3><div class="blg-texto"></div><div class="blg-aviso" hidden></div>
      <div class="blg-barra"><i></i></div>
      <div class="blg-botoes"><button class="blg-pular">Sair do guia</button><button class="blg-voltar">Voltar</button><button class="blg-prox">Próximo</button></div>
      <label class="blg-nao"><input type="checkbox"> Não mostrar o guia ao abrir o app</label>`;
    el.cartao.querySelector('.blg-pular').onclick = fechar;
    el.cartao.querySelector('.blg-voltar').onclick = () => ir(idx - 1);
    el.cartao.querySelector('.blg-prox').onclick = avancar;
    const chk = el.cartao.querySelector('.blg-nao input');
    chk.checked = ler(DESLIGADO) === '1';
    chk.onchange = () => gravar(DESLIGADO, chk.checked ? '1' : null);
    document.body.append(el.bloqueio, el.foco, el.cartao);
  }

  function avancar() {
    const p = passos[idx];
    if (p.acao) { fechar(); return p.acao(); }
    if (idx >= passos.length - 1) return fechar();
    ir(idx + 1);
  }

  function ir(n) {
    if (n < 0 || n >= passos.length) return;
    idx = n;
    const p = passos[idx];
    let escondido = false;
    if (p.painel) escondido = !mostrarPainel(p.painel);
    if (p.antes) try { p.antes(); } catch (e) {}

    const c = el.cartao;
    c.querySelector('.blg-passo').textContent = `Passo ${idx + 1} de ${passos.length}`;
    c.querySelector('h3').textContent = p.titulo;
    c.querySelector('.blg-texto').innerHTML = p.texto;
    const aviso = c.querySelector('.blg-aviso');
    aviso.hidden = !escondido;
    if (escondido) aviso.innerHTML = `O painel <b>${NOMES_PAINEL[p.painel]}</b> está escondido. Para mostrar: <b>Layout</b> → Painéis → ${NOMES_PAINEL[p.painel]}.`;
    c.querySelector('.blg-barra i').style.width = ((idx + 1) / passos.length * 100) + '%';
    c.querySelector('.blg-voltar').style.visibility = idx ? '' : 'hidden';
    c.querySelector('.blg-prox').textContent = p.botao || (idx === passos.length - 1 ? 'Concluir' : 'Próximo');

    // espera o painel/aba aparecer antes de medir
    requestAnimationFrame(() => requestAnimationFrame(() => {
      alvoAtual = achar(p);
      if (alvoAtual) {
        const r = alvoAtual.getBoundingClientRect();
        if (r.top < 70 || r.bottom > innerHeight - 10) alvoAtual.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
      posicionar();
      c.querySelector('.blg-prox').focus({ preventScroll: true });
    }));
  }

  function posicionar() {
    if (!el) return;
    const c = el.cartao, f = el.foco;
    const cw = c.offsetWidth, ch = c.offsetHeight, M = 16;
    if (!alvoAtual || !alvoAtual.isConnected) {
      f.classList.add('vazio');
      c.style.left = (innerWidth - cw) / 2 + 'px';
      c.style.top = Math.max(M, (innerHeight - ch) / 2) + 'px';
      return;
    }
    f.classList.remove('vazio');
    const r = alvoAtual.getBoundingClientRect(), P = 6;
    const a = { l: Math.max(4, r.left - P), t: Math.max(4, r.top - P), r: Math.min(innerWidth - 4, r.right + P), b: Math.min(innerHeight - 4, r.bottom + P) };
    Object.assign(f.style, { left: a.l + 'px', top: a.t + 'px', width: (a.r - a.l) + 'px', height: (a.b - a.t) + 'px' });

    // lado com espaço: direita, esquerda, embaixo, em cima; senão, dentro do destaque (canto de baixo)
    const clampY = y => Math.min(Math.max(M, y), innerHeight - ch - M);
    const clampX = x => Math.min(Math.max(M, x), innerWidth - cw - M);
    let x, y;
    if (innerWidth - a.r >= cw + 2 * M) { x = a.r + M; y = clampY(a.t); }
    else if (a.l >= cw + 2 * M) { x = a.l - cw - M; y = clampY(a.t); }
    else if (innerHeight - a.b >= ch + 2 * M) { x = clampX(a.l); y = a.b + M; }
    else if (a.t >= ch + 2 * M) { x = clampX(a.l); y = a.t - ch - M; }
    else { x = clampX(a.r - cw - M); y = clampY(a.b - ch - M); }
    c.style.left = x + 'px';
    c.style.top = y + 'px';
  }

  // enquanto o guia está aberto, o teclado é só dele (Espaço não pode cortar para o ar sem querer)
  function teclas(e) {
    if (!el) return;
    if (e.target.closest && e.target.closest('.blg-nao')) { if (e.key !== 'Escape') return; }
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { e.preventDefault(); fechar(); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); avancar(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(idx - 1); }
    else e.preventDefault();
  }
  const reposicionar = () => posicionar();

  function abrir() {
    if (el) return;
    passos = PASSOS[pagina];
    montar();
    addEventListener('keydown', teclas, true);
    addEventListener('keyup', parar, true);
    addEventListener('resize', reposicionar);
    addEventListener('scroll', reposicionar, true);
    ir(0);
  }
  const parar = e => { if (el) e.stopImmediatePropagation(); };

  function fechar() {
    if (!el) return;
    const fim = passos[passos.length - 1].fim;
    if (fim) try { fim(); } catch (e) {}
    el.bloqueio.remove(); el.foco.remove(); el.cartao.remove();
    el = null; alvoAtual = null;
    removeEventListener('keydown', teclas, true);
    removeEventListener('keyup', parar, true);
    removeEventListener('resize', reposicionar);
    removeEventListener('scroll', reposicionar, true);
  }

  // ======================= modo Ajuda =======================
  // Liga o botão "Ajuda" e passe o mouse sobre qualquer parte: aparece o que ela faz. Enquanto
  // está ligado, cliques e teclas não fazem nada (dá para explorar sem colocar nada no ar).
  // As explicações vêm destas abaixo, dos passos do guia e, por último, do "title" do elemento.
  const EXTRAS = {
    home: [
      ['#btnOperarTopo', 'Operação', 'Abre a tela de operação, onde você projeta no culto.'],
      ['#relogio', 'Relógio', 'A hora atual deste computador.'],
      ['.ferramenta[data-acao=operar]', 'Operação ao vivo', 'Abre a tela de operação: Bíblia, prévia e ao vivo, roteiro, mídia e transmissões.'],
      ['.ferramenta[data-acao=presets]', 'Presets de reunião', 'Leva até a lista de presets: cada culto salvo, pronto para abrir.'],
      ['.ferramenta[data-acao=programacao]', 'Playlist programada', 'Leva até a programação do pré-culto automático.'],
      ['.ferramenta[data-acao=criador]', 'Vídeo de louvor', 'Abre o criador de vídeo: música + fundo + letra sincronizada viram um MP4.'],
      ['.ferramenta[data-acao=celular]', 'Controle pelo celular', 'Mostra o QR code e a senha para controlar pelo celular, no mesmo Wi-Fi.'],
      ['.ferramenta[data-acao=pdf]', 'PDF em imagens', 'Cada página de um PDF vira uma imagem. Marque as que quer e crie um preset com elas.'],
      ['.ferramenta[data-acao=pastaCelular]', 'Arquivos do celular', 'Abre a pasta com os vídeos, fotos e áudios enviados pelo celular.'],
      ['.ferramenta[data-acao=pastaVideos]', 'Vídeos gerados', 'Abre a pasta com os vídeos de louvor criados no app.'],
      ['.ferramenta[data-acao=atalhos]', 'Atalhos do teclado', 'Mostra a lista de teclas: Espaço corta, B tela preta, C só fundo e outras.'],
      ['.preset [data-a=usar]', 'Usar no culto', 'Abre este preset na operação (troca o roteiro aberto por ele).'],
      ['.preset [data-a=editar]', 'Editar', 'Abre o preset na operação para mudar; depois clique em “Salvar no preset”.'],
      ['.preset [data-a=exportar]', 'Salvar como .bible', 'Salva o preset num arquivo .bible, com as mídias, para levar a outro computador.'],
      ['.preset [data-a=excluir]', 'Excluir', 'Apaga este preset (pede confirmação).'],
      ['.preset', 'Preset', 'Um culto salvo. As etiquetas mostram quantos versículos, avisos e mídias ele tem.'],
      ['#progBase', 'Usar os eventos de', 'Escolha se a programação usa o roteiro aberto ou um preset.'],
      ['#progLista', 'Pré-culto', 'Marque o que passa sozinho antes do culto.'],
      ['#progInicio', 'Começar às', 'Hora em que o pré-culto começa a passar sozinho.'],
      ['#progCulto', 'Horário do culto', 'Nessa hora entra a abertura e a programação para; daí em diante é manual.'],
      ['#progAbertura', 'Abertura', 'O que vai para a tela no horário do culto.'],
      ['label:has(#progRepetir)', 'Repetir', 'Quando a sequência acaba, começa de novo até o horário do culto.'],
      ['label:has(#progSeg)', 'Tempo de cada item', 'Quantos segundos cada foto, aviso ou versículo fica na tela no pré-culto.'],
      ['#progAgora', 'Começar agora', 'Abre a operação e começa o pré-culto na hora (bom para testar).'],
      ['#progAgendar', 'Agendar', 'Deixa a programação pronta e abre a operação. Ela só roda com a operação aberta.'],
      ['#btnMudarPasta', 'Mudar pasta', 'Escolhe outra pasta para guardar mídias, presets e backups.'],
      ['#btnAbrirPasta', 'Abrir pasta', 'Abre a pasta do BibleLyrics no Windows.'],
      ['label:has(#optCopiar)', 'Guardar cópia das mídias', 'Copia cada mídia para a pasta do BibleLyrics, para o roteiro não quebrar se o arquivo mudar de lugar.'],
      ['label:has(#optBackupAuto)', 'Backup automático', 'Faz um backup por dia (sem as mídias) e guarda os 10 últimos.'],
      ['label:has(#optMidiasBackup)', 'Incluir as mídias', 'O backup leva também as mídias: fica maior, mas funciona completo em outro computador.'],
      ['#btnRestaurar', 'Restaurar backup', 'Troca os dados deste computador pelos de um backup .bible (antes guarda uma cópia dos atuais).'],
      ['#btnBackup', 'Fazer backup agora', 'Salva um arquivo .bible com presets, roteiro, estilos e configurações.'],
      ['#btnVerificar', 'Procurar atualização', 'Verifica se há uma versão nova do BibleLyrics.'],
      ['#btnSite', 'Site', 'Abre o site biblelyrics.com.br.'],
    ],
    operador: [
      ['#pillSaida', 'Situação da projeção', 'Verde: a janela de projeção está aberta. Cinza: fechada.'],
      ['#btnNext', 'Próximo versículo', 'Coloca o versículo seguinte na prévia. Atalho: <kbd>→</kbd>.'],
      ['#btnBlack', 'Tela preta', 'Apaga toda a projeção. Atalho: <kbd>B</kbd>.'],
      ['#btnClear', 'Só fundo', 'Tira o texto e deixa só o fundo. Atalho: <kbd>C</kbd> ou <kbd>Esc</kbd>.'],
      ['#chapters', 'Capítulos', 'Clique no número para abrir o capítulo.'],
      ['#busca', 'Buscar', 'Digite uma palavra ou frase para achar na Bíblia.'],
      ['#buscaEscopo', 'Onde buscar', 'Busca na Bíblia toda, só num testamento ou só no livro aberto.'],
      ['#results', 'Resultados', 'Clique para pôr na prévia; duplo clique para pôr no ar.'],
      ['#historico', 'Histórico', 'Versículos que já foram ao ar. Clique para pôr na prévia de novo.'],
      ['#cron', 'Cronômetro', 'Há quanto tempo o que está no ar está na tela (e quanto falta, em vídeos).'],
      ['#playlist', 'Eventos do roteiro', '<b>Clique</b>: prévia • <b>Duplo clique</b>: no ar • <b>Arraste</b>: muda a ordem • <b>Botão direito</b>: mais opções.'],
      ['#presetAtivo', 'Preset em edição', 'Você está mudando este preset. Clique em “Salvar no preset” para guardar as mudanças.'],
      ['#progBarra', 'Programação', 'Mostra o pré-culto em andamento: começar, retomar, configurar ou parar.'],
      ['label:has(#pCover)', 'Preencher a tela', 'Corta as bordas para o vídeo ou a foto ocupar a tela toda.'],
      ['#pSeek', 'Posição do vídeo', 'Arraste para avançar ou voltar no vídeo/áudio.'],
      ['#pVol', 'Volume da mídia', 'Volume do vídeo ou áudio que está tocando.'],
      ['label:has(#pAuto)', 'Mídias em sequência', 'Quando uma mídia acaba e a próxima do roteiro também é mídia, ela toca sozinha.'],
      ['label:has(#pLoop)', 'Repetir (loop)', 'Repete o vídeo ou áudio atual sem parar.'],
      ['label:has(#pImgFixa)', 'Foto fica até eu trocar', 'A foto fica no ar até você escolher outra coisa.'],
      ['#campoImgSeg', 'Tempo das fotos', 'Quantos segundos cada foto fica quando as mídias estão em sequência.'],
      ['#btnAddMusicas', 'Adicionar músicas', 'Escolhe músicas do computador para a playlist.'],
      ['#listaMusicas', 'Playlist de músicas', 'Clique numa música para tocar. Ela toca separada do roteiro.'],
      ['#musVol', 'Volume das músicas', 'Volume da playlist de músicas.'],
      ['label:has(#musRepetir)', 'Repetir a playlist', 'Quando a última música acaba, volta para a primeira.'],
      ['label:has(#musAleatorio)', 'Aleatório', 'Toca as músicas fora de ordem.'],
      ['#hlSwatches', 'Cor do destaque', 'Escolha a cor usada ao clicar nas palavras para destacar.'],
      ['#novaPalavra', 'Destaque automático', 'Palavras ou frases que ficam destacadas sozinhas sempre que aparecem.'],
      ['#txt', 'Texto', 'O texto que vai para a tela. Dá para editar antes de pôr no ar.'],
      ['#refTxt', 'Referência', 'A referência mostrada junto do texto (ex.: João 3:16).'],
      ['#btnReset', 'Restaurar estilo padrão', 'Volta fonte, cores, tamanhos e posições para o padrão.'],
      ['#segBg', 'Tipo de fundo', 'Imagem, cor sólida ou degradê.'],
      ['#imgSwatches', 'Imagens de fundo', 'Clique numa imagem para usar como fundo.'],
      ['#rOverlay', 'Escurecer fundo', 'Escurece o fundo para o texto ficar mais legível.'],
      ['#listaMonitores', 'Monitores', 'As telas ligadas neste computador.'],
      ['#links', 'Transmissão pela rede', 'Links para ver a projeção no OBS, em outro PC ou numa Smart TV da mesma rede.'],
      ['#segFormato', 'Formato do PNG', 'Tamanho da imagem salva pelo botão PNG: 16:9, quadrado, 4:5 ou Story.'],
      // Ajustes, controle por controle
      ['#blocoAjustes [data-tab=texto]', 'Aba Texto', 'Destaques, texto e referência do que vai para a tela.'],
      ['#blocoAjustes [data-tab=estilo]', 'Aba Estilo', 'Fonte, cores, tamanhos, alinhamento e margens.'],
      ['#blocoAjustes [data-tab=fundo]', 'Aba Fundo', 'Imagem, cor ou degradê atrás do texto.'],
      ['#blocoAjustes [data-tab=saida]', 'Aba Saída', 'Monitores, transmissão pela rede (OBS, TV), celular e formato do PNG.'],
      ['#blocoBiblia [data-tab=nav]', 'Aba Bíblia', 'Livros, capítulos e versículos.'],
      ['#blocoBiblia [data-tab=busca]', 'Aba Buscar', 'Procura uma palavra ou frase na Bíblia.'],
      ['#blocoBiblia [data-tab=hist]', 'Aba Histórico', 'Versículos que já foram ao ar.'],
      ['#chipsRegras', 'Palavras destacadas', 'As palavras que ficam destacadas sozinhas. Clique no × para tirar.'],
      ['label:has(#chkHlBold)', 'Destaque em negrito', 'As palavras destacadas também ficam em negrito.'],
      ['#segRefStyle', 'Estilo da referência', 'Mostra “II Reis” (romano) ou “2 Reis” (número).'],
      ['label:has(#chkRef)', 'Mostrar referência', 'Mostra ou esconde a referência (ex.: João 3:16) na tela.'],
      ['label:has(#chkVersao)', 'ACF na referência', 'Acrescenta “ACF” (a versão da Bíblia) depois da referência.'],
      ['label:has(#chkNum)', 'Números dos versículos', 'Num intervalo (ex.: 16-18), mostra o número de cada versículo no texto.'],
      ['#selFonte', 'Fonte', 'O tipo de letra do texto na tela.'],
      ['#selPeso', 'Peso', 'Letra mais fina ou mais grossa.'],
      ['#corTexto', 'Cor do texto', 'A cor das letras.'],
      ['#corRef', 'Cor da referência', 'A cor da referência (ex.: João 3:16).'],
      ['#corSombra', 'Cor da sombra', 'A cor da sombra atrás das letras.'],
      ['label:has(#chkUpper)', 'Tudo maiúsculo', 'Escreve o texto todo em letras maiúsculas.'],
      ['label:has(#chkSombra)', 'Sombra no texto', 'Coloca uma sombra atrás das letras, para ler melhor sobre fundos claros.'],
      ['label:has(#chkTamAuto)', 'Tamanho automático', 'O texto diminui sozinho para caber na tela quando é grande.'],
      ['#rTam', 'Tamanho do texto', 'Aumenta ou diminui as letras.'],
      ['#rRefTam', 'Tamanho da referência', 'Tamanho da referência em relação ao texto.'],
      ['#rLh', 'Altura da linha', 'Espaço entre uma linha e outra.'],
      ['#rLs', 'Espaço entre letras', 'Afasta ou aproxima as letras.'],
      ['#segAlign', 'Alinhamento', 'Texto à esquerda, no centro ou à direita.'],
      ['#segVAlign', 'Posição vertical', 'Texto no topo, no meio ou na base da tela.'],
      ['#rMargem', 'Margem', 'Distância entre o texto e a borda da tela.'],
      ['#rLarg', 'Largura do texto', 'Quanto da largura da tela o texto pode ocupar.'],
      ['#rArea', 'Altura da área de texto', 'Quanto da altura da tela o texto pode ocupar.'],
      ['label.upload:has(#upFundo)', 'Adicionar imagens', 'Escolha fotos do computador para usar como fundo.'],
      ['#rFx', 'Enquadramento horizontal', 'Move a imagem de fundo para a esquerda ou para a direita.'],
      ['#rFy', 'Enquadramento vertical', 'Move a imagem de fundo para cima ou para baixo.'],
      ['#rZoom', 'Zoom', 'Aproxima a imagem de fundo.'],
      ['#rBlur', 'Desfoque', 'Deixa a imagem de fundo embaçada, para o texto se destacar.'],
      ['#corFundo', 'Cor de fundo', 'A cor do fundo quando o tipo é “Cor”.'],
      ['#gradSwatches', 'Degradês prontos', 'Clique num degradê para usar como fundo.'],
      ['#grad1', 'Cor 1 do degradê', 'A primeira cor do degradê.'],
      ['#grad2', 'Cor 2 do degradê', 'A segunda cor do degradê.'],
      ['#rAng', 'Ângulo do degradê', 'A direção em que as cores do degradê se misturam.'],
      ['#blocoAjustes', 'Ajustes', 'A aparência do que vai para a tela: abas Texto, Estilo, Fundo e Saída. Passe o mouse em cada controle para ver o que ele faz.'],
      ['#blocoBiblia', 'Bíblia', 'Escolha livro, capítulo e versículo, busque palavras ou veja o histórico. Clique num versículo para pôr na prévia.'],
    ],
  };
  // abas dos painéis (Bíblia, Prévia, Roteiro…): usa a explicação do painel no guia
  Object.keys(NOMES_PAINEL).forEach(id => {
    const passo = (PASSOS.operador || []).find(p => p.painel === id);
    if (passo) EXTRAS.operador.push(['.aba-' + id, 'Painel ' + NOMES_PAINEL[id],
      passo.texto.replace(/<[^>]+>/g, '').split('. ')[0].trim() + '. <br><br>Arraste esta aba para mudar o painel de lugar.']);
  });

  const DICAS = [];
  (EXTRAS[pagina] || []).forEach(([sel, titulo, texto]) => DICAS.push({ sel, titulo, texto }));
  (PASSOS[pagina] || []).forEach(p => { if (typeof p.alvo === 'string') DICAS.push({ sel: p.alvo, titulo: p.titulo, texto: p.texto }); });
  const bate = (e, sel) => { try { return e.matches(sel); } catch (err) { return false; } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // a dica do elemento mais próximo do mouse (sobe pelos pais até achar uma)
  function dicaPara(alvo) {
    for (let e = alvo; e && e.nodeType === 1 && e !== document.body; e = e.parentElement) {
      if (e.closest('.blg-dica, .blg-botao-ajuda')) return null;
      const d = DICAS.find(x => bate(e, x.sel));
      if (d) return { el: e, titulo: d.titulo, texto: d.texto };
      const t = e.getAttribute('title');
      // sem explicação própria: usa o "title" (a primeira parte vira o título)
      if (t) { const titulo = t.split(/\s[(—:]|:\s/)[0].trim(); return { el: e, titulo, texto: titulo === t.trim() ? '' : esc(t) }; }
    }
    return null;
  }

  const EVENTOS_BLOQUEADOS = ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'dragstart'];
  let ajuda = null;     // { botao, dica, borda, aviso, atual }
  function ligarAjuda(botaoEl) {
    if (ajuda) return desligarAjuda();
    if (el) fechar();
    ajuda = {
      botao: botaoEl,
      dica: Object.assign(document.createElement('div'), { className: 'blg-dica' }),
      borda: Object.assign(document.createElement('div'), { className: 'blg-borda' }),
      aviso: Object.assign(document.createElement('div'), { className: 'blg-aviso-ajuda' }),
      atual: null,
    };
    ajuda.aviso.innerHTML = '<b>Modo ajuda</b> — passe o mouse sobre qualquer parte para ver o que ela faz. Nada é clicado enquanto está ligado. <kbd>Esc</kbd> ou o botão <b>Ajuda</b> desligam.';
    ajuda.dica.hidden = ajuda.borda.hidden = true;
    document.body.append(ajuda.borda, ajuda.dica, ajuda.aviso);
    document.body.classList.add('blg-ajuda-on');
    if (botaoEl) botaoEl.classList.add('ativo');
    addEventListener('mouseover', aoPassar, true);
    EVENTOS_BLOQUEADOS.forEach(t => addEventListener(t, engolir, true));
    addEventListener('keydown', teclaAjuda, true);
    addEventListener('scroll', esconderDica, true);
  }
  function desligarAjuda() {
    if (!ajuda) return;
    ajuda.dica.remove(); ajuda.borda.remove(); ajuda.aviso.remove();
    if (ajuda.botao) ajuda.botao.classList.remove('ativo');
    document.body.classList.remove('blg-ajuda-on');
    removeEventListener('mouseover', aoPassar, true);
    EVENTOS_BLOQUEADOS.forEach(t => removeEventListener(t, engolir, true));
    removeEventListener('keydown', teclaAjuda, true);
    removeEventListener('scroll', esconderDica, true);
    ajuda = null;
  }
  function engolir(e) {
    if (e.target.closest && e.target.closest('.blg-botao-ajuda')) return;   // o próprio botão desliga
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  // Espaço, B, C… não podem mexer na projeção enquanto a ajuda está ligada
  function teclaAjuda(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key === 'Escape') desligarAjuda();
  }
  function esconderDica() { if (ajuda) { ajuda.dica.hidden = ajuda.borda.hidden = true; ajuda.atual = null; } }
  function aoPassar(e) {
    const d = dicaPara(e.target);
    if (!d) return esconderDica();
    if (d.el === ajuda.atual) return;
    ajuda.atual = d.el;
    const r = d.el.getBoundingClientRect();
    Object.assign(ajuda.borda.style, { left: r.left - 3 + 'px', top: r.top - 3 + 'px', width: r.width + 6 + 'px', height: r.height + 6 + 'px' });
    ajuda.dica.innerHTML = '<b>' + esc(d.titulo) + '</b><div>' + d.texto + '</div>';
    ajuda.dica.hidden = ajuda.borda.hidden = false;
    // embaixo do elemento; se não couber, em cima; elementos grandes: dentro, no canto de cima
    const w = ajuda.dica.offsetWidth, h = ajuda.dica.offsetHeight, M = 10;
    const x = Math.min(Math.max(M, r.left), innerWidth - w - M);
    let y;
    if (innerHeight - r.bottom >= h + 2 * M) y = r.bottom + M;
    else if (r.top >= h + 2 * M) y = r.top - h - M;
    else y = Math.max(M, r.top + M);
    ajuda.dica.style.left = x + 'px';
    ajuda.dica.style.top = y + 'px';
  }

  const cssAjuda = document.createElement('style');
  cssAjuda.textContent = `
  body.blg-ajuda-on, body.blg-ajuda-on *{cursor:help!important}
  body.blg-ajuda-on .blg-botao-ajuda, body.blg-ajuda-on .blg-botao-ajuda *{cursor:pointer!important}
  .blg-botao-ajuda.ativo{background:#5aa0ef!important;border-color:#5aa0ef!important;color:#06172e!important}
  .blg-borda{position:fixed;z-index:99980;pointer-events:none;border:2px solid #5aa0ef;border-radius:10px;background:rgba(90,160,239,.08);box-shadow:0 0 0 4px rgba(90,160,239,.18)}
  .blg-dica{position:fixed;z-index:99981;pointer-events:none;width:320px;max-width:calc(100vw - 20px);background:#151920;color:#c8c9cd;
    border:1px solid #2f3642;border-radius:12px;padding:12px 14px;box-shadow:0 20px 50px -10px rgba(0,0,0,.85);
    font:13.5px/1.5 Inter,system-ui,sans-serif;text-transform:none;letter-spacing:0;font-weight:400;text-align:left}
  .blg-dica>b{display:block;color:#eeedea;font:700 14.5px Montserrat,Inter,sans-serif;margin-bottom:4px}
  .blg-dica div b{color:#eeedea}
  .blg-dica kbd,.blg-aviso-ajuda kbd{font:600 11px Inter,sans-serif;padding:1px 5px;border-radius:5px;background:#232a35;border:1px solid #3a4250;color:#eeedea}
  .blg-aviso-ajuda{position:fixed;z-index:99982;left:50%;bottom:18px;transform:translateX(-50%);pointer-events:none;max-width:calc(100vw - 32px);
    background:#5aa0ef;color:#06172e;border-radius:12px;padding:9px 16px;font:500 13.5px Inter,system-ui,sans-serif;box-shadow:0 14px 40px -10px rgba(0,0,0,.8)}
  .blg-aviso-ajuda b{color:#06172e}`;
  document.head.appendChild(cssAjuda);

  // ======================= botões "Ajuda" e "Guia" no topo =======================
  function botao(texto, ico, titulo, acao, extra = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = titulo;
    b.innerHTML = (typeof icone === 'function' ? icone(ico, 'ico-antes') : '') + texto;
    b.onclick = e => { e.stopPropagation(); acao(b); };
    if (pagina === 'home') { b.className = 'btn fantasma pequeno blg-abrir ' + extra; q('.topo-dir')?.prepend(b); }
    else if (pagina === 'operador') { b.className = 'blg-abrir ' + extra; q('#btnConfig')?.before(b); }
    else { b.className = 'btn blg-abrir ' + extra; q('#btnNovo')?.before(b); }
  }

  function iniciar() {
    botao('Guia', 'sparkles', 'Guia passo a passo de como usar o app', () => { desligarAjuda(); abrir(); });
    if (pagina !== 'criador') {
      botao('Ajuda', 'mouse-pointer-click', 'Modo ajuda: ligue e passe o mouse sobre qualquer parte para ver o que ela faz', ligarAjuda, 'blg-botao-ajuda');
    }
    if (ler(DESLIGADO) === '1' || jaViu(pagina)) return;
    marcarVisto(pagina, true);
    // a operação monta o layout e aplica o que veio do Início antes; espera um pouco
    setTimeout(abrir, pagina === 'operador' ? 900 : 400);
  }
  if (document.readyState === 'complete') iniciar();
  else addEventListener('load', iniciar);

  window.Guia = { abrir, fechar, ajuda: () => ligarAjuda(q('.blg-botao-ajuda')) };
})();
