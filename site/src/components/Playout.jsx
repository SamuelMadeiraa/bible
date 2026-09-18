import { ArrowRight } from 'lucide-react';
import { CabecalhoSecao, Tecla } from './ui.jsx';
import { Tela } from './mockups.jsx';
import { VERSICULOS } from '../dados.js';

const PASSOS = [
  ['Escolha', 'Clique num versículo ou num evento do roteiro. Ele aparece na prévia, com moldura verde. Ninguém na igreja vê ainda.'],
  ['Confira', 'Destaque uma palavra, troque o fundo, ajuste o texto. Tudo acontece só na prévia.'],
  ['Corte', 'Aperte Espaço. A prévia entra no ar com uma transição suave e o próximo evento já sobe para a prévia.'],
];

export default function Playout() {
  return (
    <section className="secao" id="playout">
      <div className="container">
        <CabecalhoSecao
          rotulo="Como funciona"
          titulo={<>Verde é o próximo. Vermelho está no ar. <span className="nowrap">O Espaço corta.</span></>}
          texto="É o mesmo jeito de trabalhar das mesas de corte de televisão, reduzido ao que importa num culto. Se você sabe apertar uma tecla, sabe operar."
        />

        <div className="fluxo revelar">
          <div className="fluxo-tela prev">
            <span className="fluxo-rot"><i />PRÉVIA</span>
            <Tela v={VERSICULOS[1]} />
          </div>
          <div className="fluxo-meio">
            <Tecla>Espaço</Tecla>
            <ArrowRight size={26} />
            <small>ou Enter, ou o clique do passador de slides</small>
          </div>
          <div className="fluxo-tela live">
            <span className="fluxo-rot"><i />AO VIVO</span>
            <Tela v={VERSICULOS[0]} />
          </div>
        </div>

        <ol className="passos-mini">
          {PASSOS.map(([t, d], i) => (
            <li key={t} className="revelar" style={{ '--atraso': `${i * 80}ms` }}>
              <span>{i + 1}</span>
              <div><b>{t}</b><p>{d}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
