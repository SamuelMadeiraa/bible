// Quantas vezes o BibleLyrics foi baixado: soma os downloads de cada arquivo dos Releases.
// Use: node tools/downloads.js
const REPO = 'SamuelMadeiraa/bible';

const n = (v, tam) => String(v).padStart(tam);
const data = d => new Date(d).toLocaleDateString('pt-BR');

(async () => {
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases`, { headers: { 'User-Agent': 'biblelyrics' } });
  if (!r.ok) { console.log('Não consegui falar com o GitHub:', r.status); return; }
  const releases = await r.json();

  let total = 0, instalador = 0, portatil = 0;
  console.log(`\nDownloads do BibleLyrics — ${new Date().toLocaleString('pt-BR')}\n`);
  for (const rel of releases) {
    const exes = (rel.assets || []).filter(a => /\.exe$/i.test(a.name));
    const soma = exes.reduce((s, a) => s + a.download_count, 0);
    total += soma;
    instalador += exes.filter(a => /setup/i.test(a.name)).reduce((s, a) => s + a.download_count, 0);
    portatil += exes.filter(a => /portatil|portátil/i.test(a.name)).reduce((s, a) => s + a.download_count, 0);
    console.log(`${rel.tag_name.padEnd(9)} ${n(soma, 5)}   publicado em ${data(rel.published_at)}`);
    for (const a of exes) console.log(`   ${a.name.padEnd(36)} ${n(a.download_count, 5)}`);
  }
  console.log(`\n  instaladores: ${instalador}`);
  console.log(`  versão portátil: ${portatil}`);
  console.log(`  TOTAL: ${total}\n`);
  console.log('Obs.: as atualizações automáticas também baixam o instalador, então parte desse número');
  console.log('são computadores que já tinham o app e só se atualizaram.\n');
})();
