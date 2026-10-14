/** Drag only the handle; leave scrolling, focus and dismissal guards to the dialog. */
export function sheetDragShouldClose(distance: number, velocity: number, height: number) {
  return distance >= Math.min(160, Math.max(80, height * 0.2)) || (distance >= 24 && velocity >= 0.65);
}

export function attachParkSheetDrag(panel: HTMLElement, handle: HTMLButtonElement, close: () => boolean) {
  let drag: { id: number; start: number; distance: number; height: number; samples: { y: number; time: number }[] } | null = null;
  let suppressClick = false;
  let settle: Animation | undefined;
  const reset = (distance: number) => {
    panel.style.transform = '';
    panel.style.willChange = '';
    if (distance > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settle = panel.animate([{ transform: `translateY(${distance}px)` }, { transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' });
    }
  };
  const down = (event: PointerEvent) => {
    if (handle.disabled || !event.isPrimary || event.button !== 0 || window.matchMedia('(min-width: 640px)').matches) return;
    settle?.cancel();
    panel.getAnimations().forEach(animation => animation.finish());
    // One layout measurement per gesture, never during pointermove.
    drag = { id: event.pointerId, start: event.clientY, distance: 0, height: panel.getBoundingClientRect().height, samples: [{ y: event.clientY, time: event.timeStamp }] };
    suppressClick = false;
    panel.style.removeProperty('--park-sheet-release');
    handle.setPointerCapture(event.pointerId);
    panel.style.willChange = 'transform';
  };
  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag.distance = Math.max(0, event.clientY - drag.start);
    if (Math.abs(event.clientY - drag.start) > 6) suppressClick = true;
    drag.samples = [...drag.samples.filter(sample => event.timeStamp - sample.time <= 100), { y: event.clientY, time: event.timeStamp }];
    panel.style.transform = `translateY(${drag.distance}px)`;
  };
  const end = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const current = drag;
    if (event.type === 'pointerup') move(event);
    drag = null;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    const first = current.samples[0];
    const elapsed = event.timeStamp - first.time;
    const velocity = elapsed > 0 ? (event.clientY - first.y) / elapsed : 0;
    if (event.type === 'pointerup' && sheetDragShouldClose(current.distance, velocity, current.height)) {
      // Set the exit's starting position once; the CSS animation still animates transform only.
      panel.style.setProperty('--park-sheet-release', `${current.distance}px`);
      if (close()) { panel.style.transform = ''; panel.style.willChange = ''; return; }
    }
    reset(current.distance);
  };
  const click = (event: MouseEvent) => {
    // A drag must not also trigger the handle's click-to-close action.
    if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
  };
  handle.addEventListener('pointerdown', down);
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
  handle.addEventListener('lostpointercapture', end);
  handle.addEventListener('click', click);
  return () => {
    if (drag && handle.hasPointerCapture(drag.id)) handle.releasePointerCapture(drag.id);
    drag = null; settle?.cancel();
    panel.style.transform = ''; panel.style.willChange = '';
    handle.removeEventListener('pointerdown', down);
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', end);
    handle.removeEventListener('pointercancel', end);
    handle.removeEventListener('lostpointercapture', end);
    handle.removeEventListener('click', click);
  };
}
