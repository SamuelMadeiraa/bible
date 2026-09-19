import { House, Film, AlarmClock, MousePointerClick, Upload, MonitorPlay, Download } from 'lucide-react';
import { CabecalhoSecao } from './ui.jsx';
import { LINK_DOWNLOAD, VERSAO } from '../config.js';

// O que chegou nas últimas versões (3.4 e 3.5).
const NOVIDADES = [
  {
    icone: House,
    titulo: 'Tela Início',
    texto: 'O app abre num painel com tudo à mão: iniciar a operação, presets de reunião, a playlist programada, o QR code do celular e o status da TV.',
  },
  {
    icone: Film,
    titulo: 'Vídeo de louvor',
    texto: 'Escolha a música, cole a letra, escolha o fundo e sincronize tocando. O app gera um MP4 com a letra na tela, pronto para projetar ou postar.',
    destaque: true,
  },
  {
    icone: AlarmClock,
    titulo: 'Playlist programada',
    texto: 'Testemunhos, fotos e avisos passam sozinhos antes do culto. No horário, entra o louvor de abertura e daí em diante é tudo manual.',
  },
  {
    icone: MousePointerClick,
    titulo: 'Arrastar e botão direito',
    texto: 'Arraste vídeos, fotos e áudios do Windows direto para o roteiro. Botão direito num versículo: prévia, no ar, roteiro ou verso a verso.',
  },
  {
    icone: Upload,
    titulo: 'Envio pelo celular',
    texto: 'Escaneie o QR code e mande o vídeo do testemunho do próprio celular: ele cai no roteiro do computador. Controle novo, com o corte sempre à mão.',
  },
  {
    icone: MonitorPlay,
    titulo: 'Projeção automática',
    texto: 'Com a TV ligada, a projeção abre sozinha nela, em tela cheia e com fade. Sem escolher monitor, sem janela aparecendo para a igreja.',
  },
];

export default function Novidades() {
  return (
    <section className="secao" id="novidades">
      <div className="container">
        <CabecalhoSecao
          rotulo={`Novo na versão ${VERSAO}`}
          titulo="Mais tempo para o culto, menos para a mídia."
          texto="As novidades que a equipe de mídia pediu: preparar a reunião antes, deixar o pré-culto rodando sozinho e criar o vídeo da letra sem outro programa."
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
