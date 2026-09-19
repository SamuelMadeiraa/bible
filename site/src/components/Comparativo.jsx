import { X, Check } from 'lucide-react';
import { CabecalhoSecao } from './ui.jsx';

const LINHAS = [
  ['Versículo fora do roteiro: abrir outro arquivo, achar, copiar e colar', 'Digitar “jo 3 16” e apertar Espaço'],
  ['Slides, player de vídeo e navegador abertos ao mesmo tempo', 'Versículos, vídeos, fotos e lives num roteiro só'],
  ['Qualquer troca de janela aparece na TV', 'Tudo é preparado na prévia antes de ir para o ar'],
  ['Operador preso ao computador', 'Controle pelo celular, com senha'],
  ['Sem saber quanto falta para o vídeo acabar', 'Cronômetro regressivo embaixo do ao vivo'],
  ['Montar tudo de novo a cada culto', 'Presets de reunião salvos para reabrir'],
];

export default function Comparativo() {
  return (
    <section className="secao secao-alt" id="comparativo">
      <div className="container">
        <CabecalhoSecao
          rotulo="Antes e depois"
          titulo="Menos janelas. Menos susto."
          texto="O BibleLyrics junta num lugar só o que normalmente fica espalhado em três ou quatro programas."
          centro
        />
        <div className="comparacao revelar">
          <div className="comp-col antes">
            <h3>O jeito de sempre</h3>
            <ul>{LINHAS.map(([a]) => <li key={a}><X size={16} />{a}</li>)}</ul>
          </div>
          <div className="comp-col depois">
            <h3><img src="/logo.png" alt="BibleLyrics" height="20" /></h3>
            <ul>{LINHAS.map(([, d]) => <li key={d}><Check size={16} />{d}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}
