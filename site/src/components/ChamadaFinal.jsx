import { Download } from 'lucide-react';
import { LINK_DOWNLOAD, VERSAO } from '../config.js';

export default function ChamadaFinal() {
  return (
    <section className="chamada" id="baixar">
      <div className="container">
        <div className="chamada-caixa revelar">
          <div className="chamada-brilho" aria-hidden="true" />
          <h2>O próximo culto já pode começar diferente.</h2>
          <p>Instale, abra o roteiro “Culto de Domingo” e aperte Espaço. Em dez minutos você sabe se é para a sua igreja.</p>
          <a className="btn btn-primario btn-g" href={LINK_DOWNLOAD}><Download size={20} />Baixar o Bible Studio</a>
          <small>Versão {VERSAO} para Windows 10 e 11</small>
        </div>
      </div>
    </section>
  );
}
