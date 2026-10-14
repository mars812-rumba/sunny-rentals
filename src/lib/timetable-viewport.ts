/** One visibility boundary, not a scroll-driven resize animation or nested vertical scroller. */
export function observeTimetableViewport(sentinel: HTMLElement) {
  if (!('IntersectionObserver' in window)) return () => {};
  const observer = new IntersectionObserver(([entry]) => {
    // A force-mounted inactive tab has no layout bounds and must not hide page controls.
    const immersed = entry.boundingClientRect.height > 0 && entry.boundingClientRect.bottom <= 0;
    if (immersed) document.documentElement.setAttribute('data-park-timetable-immersed', 'true');
    else document.documentElement.removeAttribute('data-park-timetable-immersed');
  });
  observer.observe(sentinel);
  return () => { observer.disconnect(); document.documentElement.removeAttribute('data-park-timetable-immersed'); };
}
