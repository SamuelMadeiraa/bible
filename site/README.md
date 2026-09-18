# Site do Bible Studio

Landing page do Bible Studio feita em React + Vite, com a identidade visual da marca
(azul #024E9D, Montserrat e Inter).

```bash
npm install
npm run dev       # abre em http://localhost:5173
npm run build     # gera o site pronto em dist/
```

- **Link de download:** troque `LINK_DOWNLOAD` em `src/config.js` pelo endereço do instalador
  (por exemplo, a página de Releases do GitHub). Enquanto isso, os botões levam à seção final.
- **Textos:** cada seção fica em `src/components/`; versículos de exemplo e perguntas em `src/dados.js`.
- **Publicar:** a pasta `dist/` é um site estático — funciona na Vercel, Netlify ou GitHub Pages
  (na Vercel: importar o repositório e apontar a pasta raiz para `site`).
