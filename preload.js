const { contextBridge, ipcRenderer, webUtils } = require('electron');

const CANAIS = ['slide', 'displays-changed', 'output:state', 'media', 'media:progress', 'remoto', 'web:quadro', 'web:aviso', 'bible:abrir', 'atualizacao'];

contextBridge.exposeInMainWorld('bridge', {
  teste: process.argv.includes('--bl-teste'),     // versão de teste (BibleLyrics DEV)
  displays: () => ipcRenderer.invoke('displays'),
  openOutput: id => ipcRenderer.invoke('output:open', id),
  closeOutput: () => ipcRenderer.invoke('output:close'),
  outputState: () => ipcRenderer.invoke('output:state'),
  toggleFullscreen: () => ipcRenderer.send('output:fullscreen-toggle'),
  sendSlide: slide => ipcRenderer.send('slide', slide),
  lastSlide: () => ipcRenderer.invoke('slide:last'),
  putImage: (id, data) => ipcRenderer.send('image:put', id, data),
  getImage: id => ipcRenderer.invoke('image:get', id),
  serverInfo: () => ipcRenderer.invoke('server:info'),
  openExternal: url => ipcRenderer.send('open-external', url),

  // mídia (player interno)
  pickMedia: () => ipcRenderer.invoke('media:pick'),
  registerMedia: lista => ipcRenderer.send('media:register', lista),
  infoArquivo: caminho => ipcRenderer.invoke('media:info', caminho),
  // caminho no disco de um arquivo arrastado do Windows para o app
  caminhoDoArquivo: arquivo => { try { return webUtils.getPathForFile(arquivo); } catch (e) { return ''; } },
  sendMedia: cmd => ipcRenderer.send('media', cmd),
  lastMedia: () => ipcRenderer.invoke('media:last'),
  mediaProgress: info => ipcRenderer.send('media:progress', info),

  // transmissões ao vivo / links
  webAbrir: opcoes => ipcRenderer.invoke('web:abrir', opcoes),
  webFechar: () => ipcRenderer.invoke('web:fechar'),
  webCmd: (cmd, valor) => ipcRenderer.invoke('web:cmd', cmd, valor),
  webLogin: (url, externo) => ipcRenderer.invoke('web:login', url, externo),

  // tela Início, criador de vídeo e arquivos
  navegar: destino => ipcRenderer.send('navegar', destino),
  abrirCriador: () => ipcRenderer.send('janela:criador'),
  escolherArquivo: tipo => ipcRenderer.invoke('arquivo:escolher', tipo),
  lerArquivo: caminho => ipcRenderer.invoke('arquivo:ler', caminho),
  destinoVideo: nome => ipcRenderer.invoke('video:destino', nome),
  gravarVideo: (caminho, dados) => ipcRenderer.invoke('video:gravar', caminho, dados),
  salvarImagensPdf: (nome, imagens) => ipcRenderer.invoke('pdf:salvar-imagens', nome, imagens),
  mostrarPasta: (qual, caminho) => ipcRenderer.send('pasta:mostrar', qual, caminho),
  adicionarAoRoteiro: caminho => ipcRenderer.invoke('roteiro:adicionar', caminho),
  abrirSite: pagina => ipcRenderer.send('abrir-site', pagina),

  // pasta do BibleLyrics, arquivos .bible (presets e backups) e atualização automática
  pastaInfo: () => ipcRenderer.invoke('pasta:info'),
  escolherPasta: () => ipcRenderer.invoke('pasta:escolher'),
  pastaConfig: mudancas => ipcRenderer.invoke('pasta:config', mudancas),
  guardarMidias: caminhos => ipcRenderer.invoke('midia:guardar', caminhos),
  exportarBible: opcoes => ipcRenderer.invoke('bible:exportar', opcoes),
  lerBible: caminho => ipcRenderer.invoke('bible:ler', caminho),
  biblePendente: () => ipcRenderer.invoke('bible:pendente'),
  estadoAtualizacao: () => ipcRenderer.invoke('atualizacao:estado'),
  verificarAtualizacao: () => ipcRenderer.invoke('atualizacao:verificar'),
  instalarAtualizacao: () => ipcRenderer.send('atualizacao:instalar'),

  // controle pelo celular
  putEstado: st => ipcRenderer.send('estado:put', st),
  remoteInfo: () => ipcRenderer.invoke('remote:info'),

  // estatísticas de uso anônimas (Google Analytics)
  analytics: (nome, params) => ipcRenderer.send('analytics:evento', nome, params),

  on: (canal, cb) => {
    if (CANAIS.includes(canal)) ipcRenderer.on(canal, (e, ...args) => cb(...args));
  },
});
