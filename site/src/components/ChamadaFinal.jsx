import { Download, Smartphone } from 'lucide-react';
import { LINK_DOWNLOAD, VERSAO } from '../config.js';

export default function ChamadaFinal() {
  return (
    <section className="chamada" id="baixar">
      <div className="container">
        <div className="chamada-caixa revelar">
          <div className="chamada-brilho" aria-hidden="true" />
          <h2>O próximo culto já pode começar diferente.</h2>
          <p>Instale, monte a reunião no roteiro e aperte Espaço. Em dez minutos você sabe se é para a sua igreja.</p>
          <a className="btn btn-primario btn-g" href={LINK_DOWNLOAD}><Download size={20} />Baixar o Bible Studio</a>
          <small>Versão {VERSAO} para Windows 10 e 11</small>
          <div className="chamada-celular">
            <a className="btn btn-fantasma btn-p" href="/controle/"><Smartphone size={18} />App de controle para o celular</a>
            <small>No Bible Studio, clique em <b>📱 Celular</b> e escaneie o QR code — o app instala na tela inicial do Android e do iPhone.</small>
          </div>
        </div>
      </div>
    </section>
  );
}
