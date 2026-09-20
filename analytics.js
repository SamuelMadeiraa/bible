// Estatísticas de uso anônimas (Google Analytics 4, pelo Measurement Protocol).
// O app é desktop: as telas são arquivos locais, então o gtag.js do navegador não serve.
// Aqui o processo principal manda os eventos direto para o GA4, com um id aleatório por
// computador (nada de nome, e-mail, versículos ou arquivos).
const { app, net } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Admin do GA4 → Fluxos de dados → (fluxo) → ID da métrica e "Chaves secretas da API do Measurement Protocol"
const MEASUREMENT_ID = 'G-3PYMYJCBS1';
const API_SECRET = '4wGXAaIIRjiNHSaY97YWxg';

const INTERVALO_USO = 5 * 60 * 1000;     // a cada 5 min com o app aberto conta tempo de uso
const sessao = String(Date.now());
let cfg = null;

const arquivo = () => path.join(app.getPath('userData'), 'estatisticas.json');
function carregar() {
  if (cfg) return cfg;
  try { cfg = JSON.parse(fs.readFileSync(arquivo(), 'utf8')); } catch (e) { cfg = {}; }
  if (!cfg.clientId) {
    cfg.clientId = `${crypto.randomInt(1e9, 2e9)}.${Math.floor(Date.now() / 1000)}`;
    cfg.primeiraVez = true;
    gravar();
  }
  return cfg;
}
function gravar() {
  const { primeiraVez, ...guardar } = cfg;
  try { fs.mkdirSync(path.dirname(arquivo()), { recursive: true }); fs.writeFileSync(arquivo(), JSON.stringify(guardar)); } catch (e) {}
}

const configurado = () => !!(MEASUREMENT_ID && API_SECRET);
// em desenvolvimento (npm start) só envia se BIBLE_ANALYTICS=1, para não sujar os números
// a versão de teste (BibleLyrics DEV) nunca envia nada, para não sujar os números
const liberado = () => configurado() && !/dev/i.test(app.getName()) && (app.isPackaged || process.env.BIBLE_ANALYTICS === '1');

// o GA4 aceita nomes com letras, números e _, até 40 letras; valores de texto até 100
const nomeValido = n => String(n).replace(/[^\w]/g, '_').replace(/^(\d)/, '_$1').slice(0, 40);
function limparParams(p) {
  const saida = {};
  for (const [k, v] of Object.entries(p || {})) {
    if (typeof v === 'number' && isFinite(v)) saida[nomeValido(k)] = v;
    else if (typeof v === 'boolean') saida[nomeValido(k)] = v ? 1 : 0;
    else if (typeof v === 'string') saida[nomeValido(k)] = v.slice(0, 100);
  }
  return saida;
}

async function enviar(nome, params = {}) {
  if (!liberado()) return;
  const c = carregar();
  const corpo = {
    client_id: c.clientId,
    user_properties: {
      versao_app: { value: app.getVersion() },
      sistema: { value: `Windows ${os.release()}` },
      idioma: { value: app.getLocale() },
    },
    events: [{
      name: nomeValido(nome),
      params: { session_id: sessao, engagement_time_msec: 100, versao_app: app.getVersion(), ...limparParams(params) },
    }],
  };
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(MEASUREMENT_ID)}&api_secret=${encodeURIComponent(API_SECRET)}`;
  try { await net.fetch(url, { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json' } }); }
  catch (e) {}      // sem internet: a estatística é perdida, o app segue normal
}

function iniciar() {
  const c = carregar();
  enviar('app_aberto', { primeira_vez: !!c.primeiraVez, telas: require('electron').screen.getAllDisplays().length });
  setInterval(() => enviar('em_uso', { engagement_time_msec: INTERVALO_USO }), INTERVALO_USO).unref();
}

module.exports = { iniciar, enviar };
