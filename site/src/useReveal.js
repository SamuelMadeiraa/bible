import { useEffect } from 'react';

// Faz os elementos com a classe "revelar" aparecerem suavemente quando entram na tela.
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.revelar');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('visivel'));
      return undefined;
    }
    const io = new IntersectionObserver(entradas => {
      entradas.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visivel');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}
