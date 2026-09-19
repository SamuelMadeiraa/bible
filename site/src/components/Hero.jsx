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
          <Rotulo>Projeção para igrejas</Rotulo>
          <h1>
            Projeção de culto que <mark>qualquer um</mark> consegue operar.
          </h1>
          <p className="lead">
            A Bíblia inteira, o roteiro do culto, vídeos, lives, vídeos de louvor com a letra e o controle pelo celular num app só.
            Prévia em verde, ao vivo em vermelho, e o Espaço corta de um para o outro — do voluntário de
            primeira vez ao operador de transmissão.
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
