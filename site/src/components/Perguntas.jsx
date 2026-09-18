import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CabecalhoSecao } from './ui.jsx';
import { PERGUNTAS } from '../dados.js';

export default function Perguntas() {
  const [aberta, setAberta] = useState(0);
  return (
    <section className="secao secao-alt" id="perguntas">
      <div className="container estreito">
        <CabecalhoSecao rotulo="Perguntas" titulo="O que costumam perguntar." centro />
        <div className="faq revelar">
          {PERGUNTAS.map(({ p, r }, i) => {
            const on = aberta === i;
            return (
              <div key={p} className={'faq-item' + (on ? ' on' : '')}>
                <button aria-expanded={on} aria-controls={`faq-${i}`} onClick={() => setAberta(on ? -1 : i)}>
                  <span>{p}</span><Plus size={20} />
                </button>
                <div className="faq-resp" id={`faq-${i}`} role="region">
                  <div><p>{r}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
