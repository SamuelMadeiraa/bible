# Bible Studio

Projeção de versículos da Bíblia (Almeida Corrigida Fiel) para cultos e transmissões.
Tem duas telas: a do **operador**, no monitor do PC, e a da **projeção**, em tela cheia
no segundo monitor (projetor ou TV). As duas ficam sincronizadas em tempo real.

## Como abrir

| Jeito | O que fazer |
|---|---|
| Programa instalado | `dist/Bible Studio Setup 3.5.0.exe` (gerado por `npm run dist`) |
| Sem instalar | `dist/Bible Studio 3.5.0.exe` |
| Da pasta do projeto | duplo clique em `Abrir Bible Studio.bat`, ou `npm start` |
| Só no navegador | abra `bible.html` (versão simples, sem projeção ao vivo) |

## Na tela do operador

- **Passagem:** campo "Ir para…" (`jo 3 16`, `2rs 2:21`, `sl 23`), lista de capítulos e
  versículos, busca na Bíblia toda (não precisa de acento) e histórico do que foi projetado.
- **Prévia e Ao vivo** lado a lado. O botão **✂ Corte** faz a troca com transição suave.
  **Só fundo** tira o texto e **Tela preta** apaga tudo.
- **Destaque:** clique nas palavras para destacar na cor escolhida, ou cadastre uma palavra
  ou frase que fica destacada em todos os versículos.
- **Estilo:** 8 fontes, cores, sombra, tamanho automático, alinhamento, margens e espaçamentos.
- **Fundo:** imagem (as suas ficam salvas), cor ou degradê, com enquadramento, zoom,
  desfoque e escurecimento.
- **Exportar:** botão PNG, nos formatos 16:9, 1:1, 4:5 e Story.

## Tela Início

O app abre numa tela Início (o botão **Início** na operação volta para ela), com:
- **Iniciar operação** e o status da TV/projetor, do roteiro, da programação e do celular (QR code);
- **Presets de reunião**: criar (vazio ou com o roteiro aberto), usar no culto, abrir para editar e excluir.
  Um preset aberto para edição mostra a faixa “Editando o preset … — Salvar no preset” na operação;
- **Playlist programada**: escolha a base (roteiro aberto ou um preset), marque o pré-culto, a abertura e
  os horários e clique em *Agendar e abrir a operação* (a programação roda com a operação aberta);
- atalhos para o criador de vídeo, as pastas de arquivos do celular e de vídeos gerados, e os atalhos do teclado.

## Criador de vídeo de louvor

Janela própria (Início → *Vídeo de louvor*): escolha a música (MP3, M4A, WAV…), cole a letra (uma linha em
branco separa as telas), escolha o fundo (prontos, como o *Azul real*, ou uma imagem sua), a fonte, a posição,
o rodapé (texto dourado e logo da igreja) e sincronize — *Sincronizar tocando* (aperte Espaço no começo de
cada estrofe) ou *Distribuir automaticamente*. **Gerar vídeo MP4** cria um vídeo H.264 + AAC (1080p ou 720p)
em `Vídeos\Bible Studio`, sem internet, e o vídeo pode ir direto para o roteiro.

## Playout: prévia, corte e roteiro do culto

- **Prévia (verde)** mostra o próximo evento; **Ao vivo (vermelho)** é o que está na TV.
- **Espaço** (ou Enter) faz o **corte**: a prévia vai para o ar e o evento seguinte já entra na prévia.
- **Roteiro do culto**: lista com versículos, avisos (texto livre), vídeos, fotos, áudios,
  transmissões ao vivo, tela preta e só fundo. Clique = prévia, duplo clique = corta direto,
  arraste para reordenar, ↓/↑ andam pela lista.
- **Arrastar e soltar**: vídeos, fotos e áudios do Windows entram no roteiro (em cima de um item =
  naquela posição); versículos da Bíblia, da busca e do histórico também podem ser arrastados.
- **Botão direito** num versículo: prévia, no ar, adicionar ao roteiro (no fim, logo depois do próximo
  ou verso a verso) e copiar. Num evento do roteiro: prévia, no ar, duplicar, pré-culto, abertura e remover.
  **Insert** coloca o versículo da prévia no roteiro; **Ctrl+Z** desfaz a última remoção.
- **Programação** (botão no roteiro): no horário de início, os eventos marcados passam sozinhos
  (vídeos e áudios até o fim; fotos, avisos e versículos por alguns segundos), repetindo até o horário
  do culto. Nessa hora entra a abertura (ex.: o louvor) e depois tudo fica manual. Se o operador puser
  outra coisa no ar, o pré-culto pausa. Dá para começar, retomar e parar pelo celular.
- **Presets de reunião** (botão Presets): crie um preset com o nome que quiser a partir do roteiro aberto,
  use (troca o roteiro) ou adicione no fim, atualize com o roteiro atual, renomeie, exporte, importe e exclua.
- **Mídia**: vídeo e foto cobrem o versículo (ou ficam atrás, com “Versículo sobre o vídeo”);
  o áudio toca sem tapar a tela e continua quando você corta para um versículo.
  “Mídias em sequência” emenda vídeos/fotos seguidos; “Repetir” deixa um vídeo em loop.
  Formatos: MP4 (H.264), WebM, MP3, M4A, AAC, WAV, OGG, JPG, PNG, WebP e GIF.

## Transmissões ao vivo e links (YouTube, Univer Vídeo…)

Em **＋ Adicionar → 📡 Transmissão ao vivo / link**, cole o endereço. No corte, a página abre por cima da
projeção. O YouTube usa o player incorporado (tela limpa); nos outros sites o vídeo da página
fica em tela cheia. Para plataformas com assinatura (Univer Vídeo), use **🔑 Entrar no site**
uma vez — o login fica guardado. Tocar/pausar e volume funcionam pelo painel Mídia, e o monitor
AO VIVO mostra uma prévia da transmissão. Cortar para um versículo fecha a transmissão.
Se o YouTube não liberar o player incorporado de um vídeo, o app abre a página normal em tela cheia sozinho.

**Plataformas protegidas (Univer Vídeo e outras com assinatura):** elas usam proteção contra cópia (DRM
Widevine), que só existe no Chrome/Edge. Com a opção “Plataforma protegida” (marcada sozinha para links da
Univer), o app abre o Chrome/Edge em tela cheia no monitor da TV, com um perfil próprio do Bible Studio, e
continua controlando: corte, tocar/pausar, volume e tempo. Na primeira vez use **🔑 Entrar no site** para fazer login.

**Cronômetro:** embaixo do AO VIVO aparece quanto falta para o vídeo acabar (amarelo nos últimos 30 s,
vermelho piscando nos últimos 10 s); com versículo ou transmissão ao vivo, mostra há quanto tempo está no ar.
O celular também mostra o cronômetro.

## Layout em blocos (estilo Premiere)

Cada painel (Bíblia, Prévia, Ao vivo, Comandos, Palavras, Roteiro, Mídia, Ajustes) pode ser
arrastado pela aba para qualquer lado, dividido, empilhado em abas ou redimensionado. O menu
**▦ Layout** tem layouts prontos (Padrão, Simples, Transmissão), mostra/esconde painéis e guarda
“Meu layout”. O **Modo simples** deixa só o essencial com botões maiores. Em **⚙ Configurações**
dá para escolher a tecla de corte, o comportamento do passador de slides e as dicas.

### Atalhos

| Tecla | Ação |
|---|---|
| Espaço / Enter | corte (prévia → ao vivo) |
| ↓ ↑ | próximo / anterior evento do roteiro na prévia |
| ← → | versículo anterior / próximo na prévia |
| PageDown / PageUp | passador de slides: corta para o próximo / volta um |
| B | tela preta |
| C / Esc | só o fundo |
| Ctrl+Espaço | tocar / pausar a mídia |
| digitar uma letra | abre o "Ir para" |

## Controle pelo celular

O app abre um controle remoto em página web, na mesma porta 7777:

1. No PC, clique em **Celular** no topo: aparece o QR code e a **senha de 4 números**.
2. Escaneie com a câmera do celular (mesma rede Wi-Fi). O QR abre o app **Bible Controle**, que pode
   ser instalado na tela inicial; o modo "Direto" abre o controle sem precisar de internet.

No topo ficam sempre o que está **AO VIVO** e o **PRÓXIMO**, e embaixo a barra de **corte** com
anterior/próximo. Abas: **Bíblia** (ir para, livro e capítulo, busca, cada versículo com botão NO AR),
**Roteiro** (lista com botão NO AR e a programação do pré-culto), **Mídia** (tocar/pausar/parar/volume
e **enviar vídeos, fotos e áudios do celular** — vão para `Documentos\Bible Studio\Do celular` e entram
no roteiro) e **Tela** (texto, só o fundo, tela preta, ao vivo automático, abrir/fechar projeção).

## Projeção e transmissão

- **Segundo monitor:** escolha o monitor no topo da tela e clique em **Abrir projeção**.
  No Windows, as telas precisam estar em **Estender** (Win+P).
- **Rede (OBS, outro PC, Smart TV):** a aba **Saída** mostra os links (porta 7777).
  No OBS, use uma fonte *Navegador* em 1920×1080. Permita o acesso no firewall
  em redes privadas quando o Windows perguntar.

## Estrutura

```
main.js              processo principal: janelas, monitores e servidor da rede
preload.js           ponte segura entre as telas e o processo principal
analytics.js         estatísticas de uso (Google Analytics 4, Measurement Protocol)
app/home.*           tela Início (presets, playlist programada, ferramentas)
app/criador.*        criador de vídeo de louvor (MP4 com música, fundo e letra)
app/operador.*       tela do operador
app/roteiro.js       roteiro, prévia/corte, mídia e transmissões
app/painel.js        presets de reunião e configurações
app/layout.js        layout em blocos (dockview)
app/icones.js        ícones (Lucide), gerado por tools/gerar-icones.js
app/saida.*          tela de projeção (também usada pelo OBS/rede)
app/engine.js        desenho do versículo, igual na prévia e na projeção
app/fonts.css        fontes locais (funciona sem internet)
bible_acf.json       texto bíblico (fonte dos dados)
tools/gerar-dados.js gera bible_acf.js e fundo.js a partir do JSON e do fundo.jpg
app/logo-*.png       logo da marca (cabeçalho) • build/icon.ico e icon.png: ícone do app
bible.html           versão web antiga, sem projeção
```

O texto e o estilo são enviados para a projeção, que desenha a imagem por conta própria —
por isso a troca é rápida mesmo em 4K.

## Desenvolvimento

```bash
npm install
npm start        # abre o app
npm run dist     # gera instalador e versão portátil em dist/
```

Se mudar `bible_acf.json` ou `fundo.jpg`, rode `node tools/gerar-dados.js`.
