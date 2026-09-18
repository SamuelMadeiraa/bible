import { CabecalhoSecao, Tecla } from './ui.jsx';

export default function Passos() {
  return (
    <section className="secao" id="comecar">
      <div className="container">
        <CabecalhoSecao
          rotulo="Como começar"
          titulo="Três passos antes do próximo culto."
        />
        <ol className="passos">
          <li className="revelar">
            <span className="passo-num">1</span>
            <h3>Instale no computador da igreja</h3>
            <p>Baixe o instalador para Windows e siga o assistente. A Bíblia e as fontes já vêm dentro, sem download extra.</p>
          </li>
          <li className="revelar" style={{ '--atraso': '80ms' }}>
            <span className="passo-num">2</span>
            <h3>Ligue a TV como segunda tela</h3>
            <p>Conecte o projetor ou a TV no HDMI e deixe o Windows em <b>Estender</b> (<Tecla>Win</Tecla> + <Tecla>P</Tecla>). No app, clique em <b>Abrir projeção</b>.</p>
          </li>
          <li className="revelar" style={{ '--atraso': '160ms' }}>
            <span className="passo-num">3</span>
            <h3>Abra um roteiro e aperte Espaço</h3>
            <p>Em <b>Roteiros</b>, escolha “Culto de Domingo” e clique em <b>Usar</b>. Cada <Tecla>Espaço</Tecla> coloca o próximo evento no ar.</p>
          </li>
        </ol>
      </div>
    </section>
  );
}
