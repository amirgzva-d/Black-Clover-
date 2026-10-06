import { listMotions } from './motionStorage.js';

const SURFACE = new URLSearchParams(location.search).get('surface') || 'avatar';
if (SURFACE === 'avatar') {
  const root = document.querySelector('#avatar3d');
  let motions = [];
  let lastPlayed = '';
  let timer = 0;
  let active = true;

  const choose = () => {
    if (!motions.length) return null;
    const preferred = motions.filter(x => !/fullbody|idle/i.test(`${x.id} ${x.name}`));
    const pool = preferred.length ? preferred : motions;
    const candidates = pool.filter(x => x.id !== lastPlayed);
    return (candidates.length ? candidates : pool)[Math.floor(Math.random() * (candidates.length || pool.length))];
  };

  const schedule = (min = 18000, spread = 22000) => {
    clearTimeout(timer);
    if (!active) return;
    timer = setTimeout(() => {
      const motion = choose();
      if (motion?.id) {
        lastPlayed = motion.id;
        root?.dispatchEvent(new CustomEvent('blackclover:motion', { detail: { id: motion.id, source: 'maria-idle-director' } }));
      }
      schedule();
    }, min + Math.random() * spread);
  };

  listMotions().then(items => {
    motions = Array.isArray(items) ? items : [];
    schedule(9000, 10000);
  }).catch(() => {});

  document.addEventListener('visibilitychange', () => {
    active = !document.hidden;
    if (active) schedule(5000, 9000);
    else clearTimeout(timer);
  });

  window.blackClover?.onEvent?.(event => {
    if (!motions.length) return;
    if (event.type === 'thinking' || event.type === 'tool') {
      const action = motions.find(x => /model|fullbody|spin/i.test(`${x.id} ${x.name}`));
      if (action?.id) root?.dispatchEvent(new CustomEvent('blackclover:motion', { detail: { id: action.id, source: event.type } }));
    }
    if (event.type === 'reminder' || event.type === 'scheduled-action') {
      const action = motions.find(x => /greeting|peace|shoot/i.test(`${x.id} ${x.name}`));
      if (action?.id) root?.dispatchEvent(new CustomEvent('blackclover:motion', { detail: { id: action.id, source: event.type } }));
    }
  });
}
