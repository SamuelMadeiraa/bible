import { useEffect, useState } from 'react';
import { Menu, X, Download } from 'lucide-react';
import { LINK_DOWNLOAD } from '../config.js';

const LINKS = [
  ['Recursos', '#recursos'],
  ['Como funciona', '#playout'],
  ['Para quem', '#para-todos'],
  ['Começar', '#comecar'],
  ['Perguntas', '#perguntas'],
];

export default function Nav() {
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const f = () => setRolou(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  return (
    <header className={'nav' + (rolou ? ' rolou' : '') + (aberto ? ' aberto' : '')}>
      <div className="container nav-in">
        <a href="#topo" className="marca" aria-label="BibleLyrics — início">
          <img src="/logo.png" alt="BibleLyrics" width="172" height="24" />
        </a>
        <nav className="nav-links" aria-label="Seções">
          {LINKS.map(([t, h]) => <a key={h} href={h} onClick={() => setAberto(false)}>{t}</a>)}
        </nav>
        <a className="btn btn-primario btn-p nav-cta" href={LINK_DOWNLOAD}><Download size={16} />Baixar</a>
        <button className="nav-menu" aria-label={aberto ? 'Fechar menu' : 'Abrir menu'} aria-expanded={aberto} onClick={() => setAberto(a => !a)}>
          {aberto ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}
