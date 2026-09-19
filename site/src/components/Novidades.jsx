import { FileArchive, FolderOpen, RefreshCw, ListChecks, ShieldCheck, Film, Download } from 'lucide-react';
import { CabecalhoSecao } from './ui.jsx';
import { LINK_DOWNLOAD, VERSAO } from '../config.js';

// O que chegou nas últimas versões (3.5 e 3.6).
const NOVIDADES = [
  {
    icone: FileArchive,
    titulo: 'Arquivo .bible',
    texto: 'Presets e backups viram um arquivo só, com as mídias junto. Leve a reunião pronta para outro computador e abra com dois cliques.',
    destaque: true,
  },
  {
    icone: FolderOpen,
    titulo: 'Tudo numa pasta',
    texto: 'Escolha onde o BibleLyrics guarda mídias, presets, backups e vídeos. Backup automático todo dia, sem você lembrar.',
  },
  {
    icone: RefreshCw,
    titulo: 'Atualização automática',
    texto: 'Versão nova baixa sozinha e é instalada quando você fecha o app. Nunca no meio do culto.',
  },
  {
    icone: ListChecks,
    titulo: 'Vários versículos de uma vez',
    texto: 'Ctrl + clique marca versículos soltos, Shift + clique marca um intervalo. Botão direito e todos vão para o roteiro.',
  },
  {
    icone: ShieldCheck,
    titulo: 'Celular mais seguro',
    texto: 'O QR code traz uma chave longa e senhas erradas seguidas bloqueiam o aparelho por um tempo.',
  },
  {
    icone: Film,
    titulo: 'Vídeo de louvor',
    texto: 'Escolha a música, cole a letra, escolha o fundo e sincronize tocando. O app gera um MP4 com a letra na tela, pronto para projetar ou postar.',
  },
];

export default function Novidades() {
  return (
    <section className="secao" id="novidades">
      <div className="container">
        <CabecalhoSecao
          rotulo={`Novo na versão ${VERSAO}`}
          titulo="Mais tempo para o culto, menos para a mídia."
          texto="Leve a reunião pronta em um arquivo, tenha backup todo dia e receba as versões novas sem baixar nada na mão."
        />
        <div className="novidades">
          {NOVIDADES.map(({ icone: Icone, titulo, texto, destaque }) => (
            <article key={titulo} className={'novidade revelar' + (destaque ? ' destaque' : '')}>
              <span className="novidade-ico"><Icone size={22} /></span>
              <h3>{titulo}{destaque && <em>Novo</em>}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
        <div className="novidades-acao revelar">
          <a className="btn btn-primario" href={LINK_DOWNLOAD}><Download size={18} />Baixar a versão {VERSAO}</a>
          <span>Windows 10 e 11 • funciona sem internet</span>
        </div>
      </div>
    </section>
  );
}
