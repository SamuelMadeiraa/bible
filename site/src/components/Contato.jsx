import { Mail, MessageCircle, Camera, Bug, HelpCircle, Heart } from 'lucide-react';
import { CabecalhoSecao } from './ui.jsx';
import { CONTATO } from '../config.js';

const assunto = encodeURIComponent('Dúvida sobre o BibleLyrics');

// Canais de contato: os vazios em config.js ficam de fora
const CANAIS = [
  CONTATO.whatsapp && {
    icone: MessageCircle, titulo: 'WhatsApp', destaque: true,
    texto: 'O jeito mais rápido: mande sua dúvida e, se precisar, um print da tela.',
    acao: 'Chamar no WhatsApp',
    href: `https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o BibleLyrics.')}`,
  },
  {
    icone: Mail, titulo: 'E-mail', destaque: !CONTATO.whatsapp,
    texto: 'Dúvidas, sugestões ou ajuda para configurar na sua igreja. Respondo pessoalmente.',
    acao: CONTATO.email, href: `mailto:${CONTATO.email}?subject=${assunto}`,
  },
  CONTATO.instagram && {
    icone: Camera, titulo: 'Instagram',
    texto: 'Novidades, dicas de uso e vídeos do BibleLyrics funcionando no culto.',
    acao: '@' + CONTATO.instagram, href: `https://instagram.com/${CONTATO.instagram}`,
  },
  {
    icone: Bug, titulo: 'Encontrou um erro?',
    texto: 'Conte o que aconteceu e o que você estava fazendo. Um print ajuda muito.',
    acao: 'Relatar um problema', href: `mailto:${CONTATO.email}?subject=${encodeURIComponent('Problema no BibleLyrics')}`,
  },
  {
    icone: HelpCircle, titulo: 'Perguntas frequentes',
    texto: 'Talvez a resposta já esteja aqui: instalação, TV, celular, OBS e mais.',
    acao: 'Ver as perguntas', href: '#perguntas',
  },
].filter(Boolean);

export default function Contato() {
  return (
    <section className="secao secao-alt" id="contato">
      <div className="container">
        <div className="contato">
          <div className="contato-sobre revelar">
            <CabecalhoSecao
              rotulo="Sobre e contato"
              titulo="Feito para a equipe de mídia da igreja."
              texto="O BibleLyrics foi criado por Samuel Madeira para que qualquer voluntário consiga projetar a Bíblia, as letras e as mídias do culto sem medo de errar."
            />
            <p className="contato-nota"><Heart size={16} />Tem uma ideia que ajudaria a sua igreja? Ela pode virar a próxima versão — é só mandar.</p>
          </div>
          <div className="contato-canais">
            {CANAIS.map(({ icone: Icone, titulo, texto, acao, href, destaque }) => (
              <a key={titulo} href={href} className={'canal revelar' + (destaque ? ' destaque' : '')}
                {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                <span className="canal-ico"><Icone size={22} /></span>
                <span className="canal-txt">
                  <b>{titulo}</b>
                  <span>{texto}</span>
                  <em>{acao}</em>
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
