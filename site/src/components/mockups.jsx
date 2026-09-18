import { useEffect, useState } from 'react';
import { Scissors, Search, Radio, Film, BookOpen, StickyNote } from 'lucide-react';
import { VERSICULOS } from '../dados.js';

const reduzMovimento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A tela projetada: versículo em maiúsculas com palavras destacadas, como sai na TV.
export function Tela({ v, pequena = false }) {
  if (!v) return <div className="tela vazia" />;
  return (
    <div className={'tela' + (pequena ? ' pequena' : '')}>
      <div className="tela-fundo" />
      <p className="tela-texto">
        {v.texto.split(' ').map((p, i) => (
          <span key={i} className={v.destaque?.includes(p) ? 'hl' : ''}>{p} </span>
        ))}
      </p>
      <span className="tela-ref">{v.ref.toUpperCase()}</span>
    </div>
  );
}

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Janela do operador: prévia (verde), ao vivo (vermelho), corte, roteiro e cronômetro.
// A cada poucos segundos ela "corta" sozinha para mostrar o fluxo de trabalho.
export function MockOperador() {
  const [ar, setAr] = useState(0);
  const [cortando, setCortando] = useState(false);
  const [seg, setSeg] = useState(12);

  useEffect(() => {
    if (reduzMovimento()) return undefined;
    const t = setInterval(() => {
      setCortando(true);
      setTimeout(() => {
        setAr(a => (a + 1) % VERSICULOS.length);
        setSeg(0);
        setCortando(false);
      }, 380);
    }, 4200);
    const c = setInterval(() => setSeg(s => s + 1), 1000);
    return () => { clearInterval(t); clearInterval(c); };
  }, []);

  const prox = (ar + 1) % VERSICULOS.length;
  const roteiro = [
    { i: 'txt', nome: 'Sejam bem-vindos!', sub: 'aviso' },
    ...VERSICULOS.map(v => ({ i: 'ver', nome: v.ref, sub: v.texto })),
  ];
  const idxAr = ar + 1;

  return (
    <div className="janela" aria-hidden="true">
      <div className="janela-barra">
        <span className="bolinhas"><i /><i /><i /></span>
        <b>Bible Studio — Operador</b>
        <span className="pill-ok"><i />Projetando</span>
      </div>

      <div className="janela-corpo">
        <aside className="mk-biblia">
          <div className="mk-busca"><Search size={12} /> jo 3 16</div>
          <div className="mk-livro">Salmos · 23</div>
          {['O SENHOR é o meu pastor…', 'Deitar-me faz em verdes…', 'Refrigera a minha alma…', 'Ainda que eu andasse…'].map((t, i) => (
            <div key={i} className={'mk-vers' + (i === 0 ? ' sel' : '')}><b>{i + 1}</b>{t}</div>
          ))}
        </aside>

        <div className="mk-centro">
          <div className="mk-monitores">
            <div className="mk-mon prev">
              <div className="mk-mon-h"><i />PRÉVIA<span>{VERSICULOS[prox].ref}</span></div>
              <Tela v={VERSICULOS[prox]} pequena />
            </div>
            <div className={'mk-mon live' + (cortando ? ' flash' : '')}>
              <div className="mk-mon-h"><i />AO VIVO<span>{VERSICULOS[ar].ref}</span></div>
              <Tela v={VERSICULOS[ar]} pequena />
              <div className="mk-cron"><b>{fmt(seg)}</b><small>no ar há</small></div>
            </div>
          </div>

          <div className="mk-acoes">
            <span className="mk-btn">◀</span>
            <span className={'mk-corte' + (cortando ? ' apertado' : '')}><Scissors size={13} /> CORTE <em>Espaço</em></span>
            <span className="mk-btn">▶</span>
          </div>

          <div className="mk-roteiro">
            {roteiro.slice(0, 4).map((e, i) => (
              <div key={i} className={'mk-ev' + (i === idxAr ? ' ar' : '') + (i === idxAr + 1 ? ' prox' : '')}>
                <span className="mk-ico">{e.i === 'txt' ? <StickyNote size={11} /> : <BookOpen size={11} />}</span>
                <span className="mk-ev-nome">{e.nome}</span>
                {i === idxAr && <b className="sel-ar">NO AR</b>}
                {i === idxAr + 1 && <b className="sel-prox">PRÓXIMO</b>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Controle pelo celular.
export function MockCelular() {
  return (
    <div className="celular" aria-hidden="true">
      <div className="cel-notch" />
      <div className="cel-topo"><span><i />no ar</span><b>Salmos 23:1</b></div>
      <div className="cel-prox"><small>PRÓXIMO</small><b>Salmos 46:1</b></div>
      <div className="cel-corte"><Scissors size={14} /> CORTAR PARA O AR</div>
      <div className="cel-lista">
        <div className="cel-item"><BookOpen size={12} /><span>Filipenses 4:13</span><em>NO AR</em></div>
        <div className="cel-item"><Film size={12} /><span>Abertura.mp4</span><em>NO AR</em></div>
        <div className="cel-item"><Radio size={12} /><span>Live do culto</span><em>NO AR</em></div>
      </div>
      <div className="cel-abas"><span className="on">Roteiro</span><span>Versículo</span><span>Tela</span></div>
    </div>
  );
}
