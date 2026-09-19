import { ArrowRight, BookOpen, WifiOff, MonitorSmartphone, Smartphone, Download, Film } from 'lucide-react';
import { Rotulo } from './ui.jsx';
import { MockOperador, MockCelular } from './mockups.jsx';
import { LINK_DOWNLOAD, VERSAO } from '../config.js';

export default function Hero() {
  return (
    <section className="hero" id="topo">
      <div className="hero-brilho" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-texto">
          <Rotulo>Para a equipe de mídia da igreja</Rotulo>
          <h1>
            O versículo entra na tela <mark>antes</mark> do pastor terminar de falar.
          </h1>
          <p className="lead">
            Digite “jo 3 16”, veja na prévia e aperte Espaço. O louvor, o testemunho e a live entram do
            mesmo jeito, na mesma tela. Sem procurar arquivo no meio do culto, sem mostrar a área de
            trabalho no telão.
          </p>
          <div className="hero-acoes">
            <a className="btn btn-primario" href={LINK_DOWNLOAD}><Download size={18} />Baixar para Windows</a>
            <a className="btn btn-fantasma" href="#playout">Ver como funciona <ArrowRight size={18} /></a>
          </div>
          <p className="nota">Versão {VERSAO} • Windows 10 e 11 • Funciona sem internet</p>
          <ul className="chips">
            <li><BookOpen size={15} />Bíblia ACF completa</li>
            <li><WifiOff size={15} />Funciona offline</li>
            <li><MonitorSmartphone size={15} />Operador + TV</li>
            <li><Smartphone size={15} />Controle pelo celular</li>
            <li><Film size={15} />Vídeo de louvor</li>
          </ul>
        </div>

        <div className="hero-visual">
          <MockOperador />
          <MockCelular />
        </div>
      </div>
    </section>
  );
}
