import { Sparkles, LayoutDashboard, Check } from 'lucide-react';
import { CabecalhoSecao } from './ui.jsx';

export default function ParaTodos() {
  return (
    <section className="secao" id="para-todos">
      <div className="container">
        <CabecalhoSecao
          rotulo="Para quem"
          titulo="Do voluntário de primeira vez ao operador de transmissão."
          texto="O mesmo app se adapta a quem está operando. Um clique troca o modo."
        />
        <div className="grid-2">
          <article className="modo revelar">
            <span className="modo-ico"><Sparkles size={22} /></span>
            <h3>Modo simples</h3>
            <p>Para quem nunca operou projeção. Só a Bíblia, a prévia, o ao vivo e o roteiro — com botões grandes.</p>
            <ul className="lista-check">
              <li><Check size={16} />Presets de reunião: abrir e apertar Espaço</li>
              <li><Check size={16} />Nada de ajuste técnico à vista</li>
              <li><Check size={16} />Dicas na tela explicando cada parte</li>
            </ul>
          </article>
          <article className="modo destaque revelar" style={{ '--atraso': '80ms' }}>
            <span className="modo-ico"><LayoutDashboard size={22} /></span>
            <h3>Modo completo</h3>
            <p>Para quem opera toda semana. Painéis que se encaixam como num editor de vídeo, arrastados para onde você quiser.</p>
            <ul className="lista-check">
              <li><Check size={16} />Layout em blocos, salvo do seu jeito</li>
              <li><Check size={16} />Atalhos de teclado e passador de slides</li>
              <li><Check size={16} />Estilo, fundos, destaques e saída para OBS</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
