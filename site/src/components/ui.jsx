// Peças visuais repetidas nas seções.
export function Rotulo({ children }) {
  return <span className="rotulo">{children}</span>;
}

export function CabecalhoSecao({ rotulo, titulo, texto, centro = false }) {
  return (
    <div className={'cab-secao revelar' + (centro ? ' centro' : '')}>
      {rotulo && <Rotulo>{rotulo}</Rotulo>}
      <h2>{titulo}</h2>
      {texto && <p className="sub">{texto}</p>}
    </div>
  );
}

export function Tecla({ children }) {
  return <kbd className="tecla">{children}</kbd>;
}
