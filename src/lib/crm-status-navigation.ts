export const CRM_SWIPE_STATUSES = ['new', 'in_work', 'pre_booking', 'confirmed'] as const;

export function adjacentCrmStatus(status: string, direction: 'next' | 'previous') {
  const index = CRM_SWIPE_STATUSES.findIndex(item => item === status);
  return index < 0 ? status : CRM_SWIPE_STATUSES[Math.max(0, Math.min(CRM_SWIPE_STATUSES.length - 1, index + (direction === 'next' ? 1 : -1)))];
}

type Lead = { user_id: number | string; status?: string; archived?: boolean; has_new_messages?: boolean; dialog_status?: { has_new_messages?: boolean }; dialog?: { has_new_messages?: boolean } };

function canonicalStatus(status?: string) {
  return status === 'in_progress' ? 'in_work' : ['hot', 'booked', 'pending'].includes(status || '') ? 'pre_booking' : status === 'interested' ? 'new' : status || 'new';
}

export function normalizeCrmLead<T extends Lead>(lead: T): T {
  const dialog = { ...(lead.dialog || {}), ...(lead.dialog_status || {}) };
  const summary = lead as Lead & Record<string, unknown>;
  for (const key of ['claude_status', 'last_message_from', 'last_message_at', 'message_count', 'active']) {
    if (summary[key] !== undefined) Object.assign(dialog, { [key]: summary[key] });
  }
  // The bulk API's chronological log summary is newer than legacy nested snapshots.
  if (typeof lead.has_new_messages === 'boolean') dialog.has_new_messages = lead.has_new_messages;
  return { ...lead, status: canonicalStatus(lead.status), dialog_status: dialog, dialog };
}

export function clearCrmLeadUnread<T extends Lead>(lead: T, userId: number | string): T {
  if (String(lead.user_id) !== String(userId)) return lead;
  return { ...lead, has_new_messages: false, dialog_status: { ...lead.dialog_status, has_new_messages: false }, dialog: { ...lead.dialog, has_new_messages: false } };
}

export function crmUnreadByStatus(leads: Lead[]) {
  const counts: Record<string, number> = { new: 0, in_work: 0, pre_booking: 0, confirmed: 0, archive: 0 };
  const seen = new Set<string>();
  for (const raw of leads) {
    const lead = normalizeCrmLead(raw);
    const id = String(lead.user_id);
    if (seen.has(id) || lead.archived) continue;
    seen.add(id);
    const status = lead.status || 'new';
    if (Object.prototype.hasOwnProperty.call(counts, status) && lead.dialog_status?.has_new_messages === true) counts[status]++;
  }
  return counts;
}

export function attachCrmStatusSwipes(node: HTMLElement, select: (direction: 'next' | 'previous') => void) {
  let gesture: { id: number; x: number; y: number; time: number; horizontal: boolean } | null = null;
  let suppressClick = false;
  const down = (event: PointerEvent) => {
    gesture = null; suppressClick = false;
    if (!event.isPrimary || !['touch', 'pen'].includes(event.pointerType)) return;
    // Preserve browser back/forward edge gestures and native control interactions.
    if (event.clientX < 20 || event.clientX > window.innerWidth - 20) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest('input, textarea, select, button, a, label, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="dialog"], [data-crm-no-swipe]')) return;
    for (let element: Element | null = target; element && element !== node; element = element.parentElement) {
      if (element.scrollWidth > element.clientWidth && ['auto', 'scroll'].includes(getComputedStyle(element).overflowX)) return;
    }
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, horizontal: false };
  };
  const move = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const x = Math.abs(event.clientX - gesture.x), y = Math.abs(event.clientY - gesture.y);
    if (Math.max(x, y) < 12) return;
    if (!gesture.horizontal && y >= x) { gesture = null; return; }
    gesture.horizontal = true;
    suppressClick = true;
  };
  const end = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const current = gesture;
    gesture = null;
    const x = event.clientX - current.x, y = event.clientY - current.y;
    if (Math.abs(x) >= 60 && Math.abs(x) > Math.abs(y) * 1.5 && event.timeStamp - current.time <= 900) {
      suppressClick = true;
      select(x < 0 ? 'next' : 'previous');
    }
  };
  const cancel = () => { gesture = null; };
  const click = (event: MouseEvent) => {
    if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
  };
  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', end);
  node.addEventListener('pointercancel', cancel);
  node.addEventListener('click', click, true);
  return () => {
    node.removeEventListener('pointerdown', down); node.removeEventListener('pointermove', move);
    node.removeEventListener('pointerup', end); node.removeEventListener('pointercancel', cancel);
    node.removeEventListener('click', click, true);
  };
}
