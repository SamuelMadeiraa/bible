import { Presentation, UserRound, TvMinimal } from 'lucide-react';
import { CabecalhoSecao } from './ui.jsx';

const DORES = [
  {
    icone: Presentation,
    titulo: 'O slide travou no louvor',
    texto: 'O pregador cita um versículo que não estava previsto e alguém precisa abrir outro arquivo, achar o texto e colar — com a igreja olhando para a tela em branco.',
  },
  {
    icone: UserRound,
    titulo: 'Só uma pessoa sabe operar',
    texto: 'Quando ela falta, a projeção fica parada. Os programas de projeção costumam ser pensados para técnico, não para o voluntário do domingo.',
  },
  {
    icone: TvMinimal,
    titulo: 'O vídeo não abre na TV',
    texto: 'O vídeo do aviso está num programa, a live em outro navegador e o versículo num terceiro. Cada troca é uma janela que aparece para todo mundo.',
  },
];

export default function Problema() {
  return (
    <section className="secao" id="problema">
      <div className="container">
        <CabecalhoSecao
          rotulo="O problema"
          titulo="Domingo, cinco minutos antes do culto."
          texto="Ninguém erra de propósito. A projeção dá errado quando cada coisa mora num programa diferente e quem opera precisa lembrar de tudo sob pressão."
        />
        <div className="grid-3">
          {DORES.map(({ icone: Icone, titulo, texto }, i) => (
            <article key={titulo} className="card revelar" style={{ '--atraso': `${i * 80}ms` }}>
              <span className="card-ico"><Icone size={20} /></span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
