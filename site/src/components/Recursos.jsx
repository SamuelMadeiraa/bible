import { useState } from 'react';
import { BookOpen, ListOrdered, Clapperboard, Smartphone, Check, Search, StickyNote, Film, Radio, Image, Music, Timer, AlarmClock, Play } from 'lucide-react';
import { CabecalhoSecao } from './ui.jsx';
import { Tela, MockCelular } from './mockups.jsx';
import { VERSICULOS } from '../dados.js';

const ABAS = [
  {
    id: 'biblia',
    icone: BookOpen,
    nome: 'Bíblia',
    titulo: 'Qualquer versículo em dois segundos.',
    texto: 'Digite do jeito que o pregador fala. “jo 3 16”, “2rs 2:21”, “salmos 23” — o app entende e já mostra na prévia. Busca por palavra na Bíblia inteira, sem se preocupar com acento.',
    itens: [
      'Almeida Corrigida Fiel com os 66 livros',
      'Intervalos de versículos (ex.: 1Co 13:4-7)',
      'Clique na palavra para destacar em cor',
      'Histórico do que já passou no culto',
    ],
  },
  {
    id: 'roteiro',
    icone: ListOrdered,
    nome: 'Roteiro',
    titulo: 'O culto inteiro numa lista.',
    texto: 'Versículos, avisos, vídeos, fotos, áudios e lives na ordem em que vão acontecer. O próximo evento fica esperando na prévia; o Espaço coloca no ar e já prepara o seguinte.',
    itens: [
      'Presets de reunião: crie com o nome que quiser e reabra quando precisar',
      'Arraste vídeos, fotos e áudios do Windows direto para a lista',
      'Botão direito no versículo: roteiro, logo depois do próximo ou verso a verso',
      'Avisos em texto livre, editáveis na hora, e Ctrl+Z para desfazer',
    ],
  },
  {
    id: 'midia',
    icone: Clapperboard,
    nome: 'Mídia',
    titulo: 'Vídeo, foto, música e live no mesmo lugar.',
    texto: 'O vídeo do aviso, a música de fundo da oração e a live do YouTube entram com o mesmo corte do versículo. Embaixo do ao vivo, um cronômetro mostra quanto falta para o vídeo acabar.',
    itens: [
      'Vídeos MP4, fotos, áudios e lives do YouTube',
      'Plataformas com assinatura, como a Univer Vídeo',
      'Música de fundo continua tocando sob o versículo',
      'Cronômetro fica amarelo e depois vermelho no fim',
    ],
  },
  {
    id: 'video',
    icone: Film,
    nome: 'Vídeo de louvor',
    titulo: 'A letra da música, pronta em minutos.',
    texto: 'Escolha a música, cole a letra e escolha o fundo. Aperte Espaço no começo de cada estrofe enquanto a música toca, e o Bible Studio gera um vídeo MP4 com a letra sincronizada — no mesmo estilo dos vídeos de louvor que a igreja já conhece.',
    itens: [
      'Fundos prontos (azul, noite, púrpura…) ou uma imagem sua',
      'Fonte, posição, cor e rodapé com o logo da igreja',
      'Sincronize tocando ou distribua a letra automaticamente',
      'MP4 em Full HD, sem internet, direto para o roteiro',
    ],
  },
  {
    id: 'programacao',
    icone: AlarmClock,
    nome: 'Programação',
    titulo: 'O pré-culto roda sozinho.',
    texto: 'Marque os testemunhos, fotos e avisos que passam antes do culto e o horário de começar. No horário do culto entra o louvor de abertura, e daí em diante é tudo manual — pelo computador ou pelo celular.',
    itens: [
      'Vídeos e áudios até o fim; fotos e avisos por alguns segundos',
      'Repete a sequência até a hora do culto',
      'Pausa sozinho se alguém colocar outra coisa no ar',
      'Começar, retomar e parar também pelo celular',
    ],
  },
  {
    id: 'celular',
    icone: Smartphone,
    nome: 'Celular',
    titulo: 'O controle vai para o seu bolso.',
    texto: 'Escaneie o QR code que aparece no computador e o celular vira controle remoto, na mesma rede Wi-Fi. O pregador pode passar os próprios versículos do púlpito, ou o operador pode andar pela igreja.',
    itens: [
      'QR code e senha de 4 números, sem digitar endereço',
      'Ao vivo e próximo sempre no topo, corte sempre à mão',
      'Envie vídeos, fotos e áudios do celular para o roteiro',
      'Instala como app (Bible Controle) no Android e no iPhone',
    ],
  },
];

function VisualBiblia() {
  return (
    <div className="vis vis-biblia">
      <div className="vis-busca"><Search size={15} /><span>jo 3 16</span><kbd>Enter</kbd></div>
      <div className="vis-resultado"><b>João 3:16</b> Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito…</div>
      <Tela v={{ ...VERSICULOS[0], destaque: ['SENHOR', 'pastor,'] }} />
    </div>
  );
}

function VisualRoteiro() {
  const evs = [
    { ic: StickyNote, n: 'Sejam bem-vindos!', s: 'aviso' },
    { ic: BookOpen, n: 'Salmos 122:1', s: 'Alegrei-me quando me disseram…', ar: true },
    { ic: Film, n: 'Abertura.mp4', s: 'vídeo • 2:14', prox: true },
    { ic: StickyNote, n: 'Avisos da semana', s: 'aviso' },
    { ic: BookOpen, n: 'Malaquias 3:10', s: 'Trazei todos os dízimos…' },
    { ic: Radio, n: 'Live do culto', s: 'transmissão • youtube.com' },
  ];
  return (
    <div className="vis vis-roteiro">
      {evs.map(({ ic: Ic, n, s, ar, prox }, i) => (
        <div key={i} className={'vis-ev' + (ar ? ' ar' : '') + (prox ? ' prox' : '')}>
          <span className="vis-num">{i + 1}</span>
          <span className="vis-ico"><Ic size={14} /></span>
          <span className="vis-ev-txt"><b>{n}</b><small>{s}</small></span>
          {ar && <em className="sel-ar">NO AR</em>}
          {prox && <em className="sel-prox">PRÓXIMO</em>}
        </div>
      ))}
    </div>
  );
}

function VisualMidia() {
  return (
    <div className="vis vis-midia">
      <div className="vis-video">
        <div className="vis-video-img"><Film size={34} /></div>
        <div className="vis-cron">
          <b>−0:08</b>
          <span><small>FALTA PARA ACABAR</small>Abertura.mp4 • 2:06 de 2:14</span>
        </div>
        <div className="vis-barra"><i /></div>
      </div>
      <div className="vis-fontes">
        <span><Film size={14} />Vídeo</span>
        <span><Image size={14} />Foto</span>
        <span><Music size={14} />Áudio</span>
        <span><Radio size={14} />YouTube</span>
        <span><Radio size={14} />Univer</span>
        <span><Timer size={14} />Cronômetro</span>
      </div>
    </div>
  );
}

function VisualVideo() {
  return (
    <div className="vis vis-video-louvor">
      <div className="louvor-tela">
        <div className="louvor-letra">
          <span>Criou o céu, criou a terra</span>
          <span>Criou o sol e as estrelas</span>
          <span>Tudo Ele fez, tudo criou</span>
          <span>Tudo formou</span>
        </div>
        <div className="louvor-rodape">Não há Deus maior</div>
      </div>
      <div className="louvor-sinc">
        <span className="louvor-play"><Play size={14} /></span>
        <div className="louvor-linha"><i style={{ left: '6%' }} /><i style={{ left: '31%' }} /><i style={{ left: '55%' }} /><i style={{ left: '79%' }} /><b style={{ width: '38%' }} /></div>
        <span className="louvor-mp4">MP4</span>
      </div>
    </div>
  );
}

function VisualProgramacao() {
  const itens = [
    { h: '18:30', n: 'Testemunho da Maria', s: 'vídeo • 2:40', ic: Film, feito: true },
    { h: '18:33', n: 'Avisos da semana', s: 'foto • 10 s', ic: Image, feito: true },
    { h: '18:33', n: 'Testemunho do João', s: 'vídeo • 3:05', ic: Film, ar: true },
    { h: '19:00', n: 'Louvor de abertura', s: 'áudio • abertura do culto', ic: Music, abertura: true },
  ];
  return (
    <div className="vis vis-prog">
      <div className="prog-faixa"><AlarmClock size={15} /><b>Pré-culto no ar</b><span>abertura em 12:40</span></div>
      {itens.map(({ h, n, s, ic: Ic, feito, ar, abertura }) => (
        <div key={n} className={'prog-ev' + (ar ? ' ar' : '') + (feito ? ' feito' : '') + (abertura ? ' abertura' : '')}>
          <span className="prog-h">{h}</span>
          <span className="vis-ico"><Ic size={14} /></span>
          <span className="vis-ev-txt"><b>{n}</b><small>{s}</small></span>
          {ar && <em className="sel-ar">NO AR</em>}
          {abertura && <em className="sel-prox">ABERTURA</em>}
        </div>
      ))}
    </div>
  );
}

const VISUAIS = { biblia: VisualBiblia, roteiro: VisualRoteiro, midia: VisualMidia, video: VisualVideo, programacao: VisualProgramacao, celular: () => <div className="vis vis-cel"><MockCelular /></div> };

export default function Recursos() {
  const [aba, setAba] = useState('biblia');
  const atual = ABAS.find(a => a.id === aba);
  const Visual = VISUAIS[aba];

  return (
    <section className="secao secao-alt" id="recursos">
      <div className="container">
        <CabecalhoSecao
          rotulo="Recursos"
          titulo="Tudo o que o culto precisa, num app só."
          texto="Sem menu escondido e sem configuração para caçar. O que o culto precisa está à vista."
          centro
        />
        <div className="abas revelar" role="tablist" aria-label="Recursos">
          {ABAS.map(({ id, icone: Icone, nome }) => (
            <button key={id} role="tab" aria-selected={aba === id} className={aba === id ? 'on' : ''} onClick={() => setAba(id)}>
              <Icone size={17} />{nome}
            </button>
          ))}
        </div>
        <div className="aba-painel entrar" role="tabpanel" key={aba}>
          <div className="aba-texto">
            <h3>{atual.titulo}</h3>
            <p>{atual.texto}</p>
            <ul className="lista-check">
              {atual.itens.map(t => <li key={t}><Check size={16} />{t}</li>)}
            </ul>
          </div>
          <div className="aba-visual"><Visual /></div>
        </div>
      </div>
    </section>
  );
}
