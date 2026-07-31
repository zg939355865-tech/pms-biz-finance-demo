(function legacyPageBridge() {
  function applyTableSemantics() {
    document.body.dataset.publicComponent = 'LegacyPageBridge';
    document.querySelectorAll('table td').forEach((cell) => {
      if (cell.querySelector('input, select, textarea, button')) return;
      const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      cell.title = cell.title || text;
      if (text.length > 12 || cell.scrollWidth > cell.clientWidth) {
        cell.classList.add('legacy-cell-ellipsis');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(applyTableSemantics));
  } else {
    requestAnimationFrame(applyTableSemantics);
  }
})();
