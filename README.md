# Bible ACF Studio

Projeção de versículos da Bíblia (Almeida Corrigida Fiel) para cultos e transmissões.
Tem duas telas: a do **operador**, no monitor do PC, e a da **projeção**, em tela cheia
no segundo monitor (projetor ou TV). As duas ficam sincronizadas em tempo real.

## Como abrir

| Jeito | O que fazer |
|---|---|
| Programa instalado | `dist/Bible ACF Studio Setup 2.0.0.exe` (gerado por `npm run dist`) |
| Sem instalar | `dist/Bible ACF Studio 2.0.0.exe` |
| Da pasta do projeto | duplo clique em `Abrir Bible ACF Studio.bat`, ou `npm start` |
| Só no navegador | abra `bible.html` (versão simples, sem projeção ao vivo) |

## Na tela do operador

- **Passagem:** campo "Ir para…" (`jo 3 16`, `2rs 2:21`, `sl 23`), lista de capítulos e
  versículos, busca na Bíblia toda (não precisa de acento) e histórico do que foi projetado.
- **Prévia e Ao vivo** lado a lado. O botão **Enviar ao vivo** faz a troca com transição suave.
  **Limpar texto** deixa só o fundo e **Tela preta** apaga tudo.
- **Destaque:** clique nas palavras para destacar na cor escolhida, ou cadastre uma palavra
  ou frase que fica destacada em todos os versículos.
- **Estilo:** 8 fontes, cores, sombra, tamanho automático, alinhamento, margens e espaçamentos.
- **Fundo:** imagem (as suas ficam salvas), cor ou degradê, com enquadramento, zoom,
  desfoque e escurecimento.
- **Exportar:** botão PNG, nos formatos 16:9, 1:1, 4:5 e Story.

### Atalhos

| Tecla | Ação |
|---|---|
| Enter / Espaço | enviar ao vivo |
| ← → / PageUp PageDown | versículo anterior / próximo (funciona com passador de slides) |
| B | tela preta |
| C / Esc | limpar texto |
| digitar uma letra | abre o "Ir para" |

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
app/operador.*       tela do operador
app/saida.*          tela de projeção (também usada pelo OBS/rede)
app/engine.js        desenho do versículo, igual na prévia e na projeção
app/fonts.css        fontes locais (funciona sem internet)
bible_acf.json       texto bíblico (fonte dos dados)
tools/gerar-dados.js gera bible_acf.js e fundo.js a partir do JSON e do fundo.jpg
build/icon.svg       ícone do app (gera icon.ico e icon.png)
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
