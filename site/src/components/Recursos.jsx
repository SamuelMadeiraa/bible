import { useState } from 'react';
import { BookOpen, ListOrdered, Clapperboard, Smartphone, Check, Search, StickyNote, Film, Radio, Image, Music, Timer } from 'lucide-react';
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
      '10 roteiros prontos: Culto de Domingo, Santa Ceia, Batismo…',
      'Avisos em texto livre, editáveis na hora',
      'Arraste para mudar a ordem',
      'Salve e reabra o roteiro de cada culto',
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
    id: 'celular',
    icone: Smartphone,
    nome: 'Celular',
    titulo: 'O controle vai para o seu bolso.',
    texto: 'Na mesma rede Wi-Fi, o celular vira controle remoto com senha. O pregador pode passar os próprios versículos do púlpito, ou o operador pode andar pela igreja.',
    itens: [
      'Senha de 4 números a cada vez que o app abre',
      'Corte, próximo evento, versículos e busca',
      'Tocar, pausar e volume da mídia',
      'Instala como ícone na tela inicial',
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

const VISUAIS = { biblia: VisualBiblia, roteiro: VisualRoteiro, midia: VisualMidia, celular: () => <div className="vis vis-cel"><MockCelular /></div> };

export default function Recursos() {
  const [aba, setAba] = useState('biblia');
  const atual = ABAS.find(a => a.id === aba);
  const Visual = VISUAIS[aba];

  return (
    <section className="secao secao-alt" id="recursos">
      <div className="container">
        <CabecalhoSecao
          rotulo="Recursos"
          titulo="Quatro coisas, bem feitas."
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
