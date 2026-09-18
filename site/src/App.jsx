import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Problema from './components/Problema.jsx';
import Recursos from './components/Recursos.jsx';
import Playout from './components/Playout.jsx';
import Comparativo from './components/Comparativo.jsx';
import ParaTodos from './components/ParaTodos.jsx';
import Integracoes from './components/Integracoes.jsx';
import Passos from './components/Passos.jsx';
import Perguntas from './components/Perguntas.jsx';
import ChamadaFinal from './components/ChamadaFinal.jsx';
import Rodape from './components/Rodape.jsx';
import { useReveal } from './useReveal.js';

export default function App() {
  useReveal();
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problema />
        <Recursos />
        <Playout />
        <Comparativo />
        <ParaTodos />
        <Integracoes />
        <Passos />
        <Perguntas />
        <ChamadaFinal />
      </main>
      <Rodape />
    </>
  );
}
