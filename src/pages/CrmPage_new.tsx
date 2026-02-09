import { useState, useMemo, useCallback } from 'react';
import { Lead, LeadStatus, LeadMarker, DialogFilter, Period } from '@/types/crm';
import { STATUS_CONFIGS } from '@/types/crm';
import { mockLeads, mockBookings, mockChats, mockDocuments } from '@/data/mockCrmData';
import StatusBar from './StatusBar';
import LeadCard from './LeadCard';
import BottomFilters from './BottomFilters';
import LeadDetailModal from './LeadDetailModal';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const CrmPage = () => {
  const [period, setPeriod] = useState<Period>('all');
  const [activeStatus, setActiveStatus] = useState<LeadStatus>('new');
  const [dialogFilter, setDialogFilter] = useState<DialogFilter>('all');
  const [markerFilter, setMarkerFilter] = useState('all');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [selectedUser, setSelectedUser] = useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [users, setUsers] = useState<Lead[]>(mockLeads);
  const [loading] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const s: Record<LeadStatus, number> = { new: 0, in_work: 0, pre_booking: 0, confirmation: 0, archive: 0 };
    users.forEach(u => {
      const st = u.final_status || u.status;
      if (s[st] !== undefined) s[st]++;
    });
    return s;
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    let result = users.filter(u => (u.final_status || u.status) === activeStatus);
    if (dialogFilter === 'new') result = result.filter(u => u.dialog_status?.has_new_messages);
    if (dialogFilter === 'ai-on') result = result.filter(u => u.dialog_status?.claude_status === 'active');
    if (markerFilter !== 'all') result = result.filter(u => u.marker === markerFilter);
    return result;
  }, [users, activeStatus, dialogFilter, markerFilter]);

  // Counts for bottom filters
  const counts = useMemo(() => ({
    all: users.filter(u => (u.final_status || u.status) === activeStatus).length,
    new: users.filter(u => (u.final_status || u.status) === activeStatus && u.dialog_status?.has_new_messages).length,
    ai: users.filter(u => (u.final_status || u.status) === activeStatus && u.dialog_status?.claude_status === 'active').length,
  }), [users, activeStatus]);

  // Handlers (preserved from original)
  const handleStatusChange = useCallback((userId: string, status: string) => {
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, status: status as LeadStatus } : u));
  }, []);

  const handleMarkerChange = useCallback((userId: string, marker: LeadMarker) => {
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, marker } : u));
  }, []);

  const handleArchiveAction = useCallback((userId: string) => {
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, status: 'archive' as LeadStatus } : u));
  }, []);

  const handleQuickSaveNote = useCallback((userId: string) => {
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, last_note: tempNote } : u));
    setEditingNoteId(null);
  }, [tempNote]);

  const openUserDetails = (user: Lead) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const openUserChat = (user: Lead) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const handleRefresh = () => {
    // placeholder for backend refresh
  };

  const handleSendMessage = (text: string) => {
    // placeholder
    console.log('Send:', text);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header: Period + Statuses */}
      <div className="px-1 pt-2 pb-1 space-y-1.5">
        {/* Period tabs */}
        <div className="flex justify-center">
          <div className="inline-flex bg-muted rounded-md p-0.5">
            {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1 text-[10px] font-semibold uppercase rounded-sm transition-all',
                  period === p
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Status cards */}
        <StatusBar stats={stats} activeStatus={activeStatus} onStatusChange={setActiveStatus} />
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto px-0.5 pb-14 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" size={16} />
            <span className="text-xs">Синхронизация...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            Нет лидов в этом статусе
          </div>
        ) : (
          filteredUsers.map(user => (
            <LeadCard
              key={user.user_id}
              user={user}
              editingNoteId={editingNoteId}
              tempNote={tempNote}
              onEditNote={(id, note) => { setEditingNoteId(id); setTempNote(note); }}
              onSaveNote={handleQuickSaveNote}
              onTempNoteChange={setTempNote}
              onOpenDetails={openUserDetails}
              onOpenChat={openUserChat}
              onStatusChange={handleStatusChange}
              onArchive={handleArchiveAction}
              onMarkerChange={handleMarkerChange}
            />
          ))
        )}
      </div>

      {/* Bottom filters */}
      <BottomFilters
        dialogFilter={dialogFilter}
        markerFilter={markerFilter}
        onDialogFilterChange={setDialogFilter}
        onMarkerFilterChange={setMarkerFilter}
        onRefresh={handleRefresh}
        counts={counts}
      />

      {/* Detail Modal */}
      <LeadDetailModal
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        user={selectedUser}
        bookings={mockBookings}
        chats={mockChats}
        documents={mockDocuments}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default CrmPage;
