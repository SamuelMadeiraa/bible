import { Projector, Cast, Smartphone, Presentation, Radio, WifiOff } from 'lucide-react';
import { CabecalhoSecao } from './ui.jsx';

const ITENS = [
  [Projector, 'Projetor ou TV no HDMI', 'A projeção abre em tela cheia na segunda tela; o operador fica no monitor.'],
  [Cast, 'OBS e transmissão', 'Um link da rede vira fonte de navegador no OBS, em 1920×1080.'],
  [Smartphone, 'Celular na mesma rede', 'Android ou iPhone, direto no navegador, com senha.'],
  [Presentation, 'Passador de slides', 'O clique avança e coloca no ar. O botão de voltar desfaz.'],
  [Radio, 'YouTube e plataformas', 'Lives e vídeos entram no roteiro como qualquer outro evento.'],
  [WifiOff, 'Sem internet', 'Bíblia, fontes, fundos e mídias locais funcionam offline.'],
];

export default function Integracoes() {
  return (
    <section className="secao secao-alt" id="integracoes">
      <div className="container">
        <CabecalhoSecao
          rotulo="Funciona com o que você já tem"
          titulo="Nenhum equipamento novo."
          texto="Um computador com Windows, a TV ou o projetor da igreja e, se quiser, o celular de quem opera."
          centro
        />
        <div className="grid-3">
          {ITENS.map(([Icone, t, d], i) => (
            <article key={t} className="card card-linha revelar" style={{ '--atraso': `${(i % 3) * 70}ms` }}>
              <span className="card-ico"><Icone size={20} /></span>
              <div><h3>{t}</h3><p>{d}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
