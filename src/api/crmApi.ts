import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import logoImg from "@/assets/logo.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Archive, MessageSquare, User, Play, Pause, StopCircle } from 'lucide-react';

// Состояния Claude
type ClaudeStatus = 'inactive' | 'active' | 'paused' | 'stopped';

interface User {
  user_id: number;
  username: string | null;
  timestamp: string;
  car_interested: string | null;
  dates_selected: {
    start: string;
    end: string;
    days: number;
  } | null;
  action: string;
  final_status: string;
  form_started: boolean;
  booking_submitted: boolean;
  last_note?: string;
  archived_at?: string;
}

interface ChatMessage {
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
}

interface HistoryEntry {
  timestamp: string;
  action: string;
  note?: string;
  old_status?: string;
  new_status?: string;
}

interface Booking {
  booking_id: string;
  user_id: number;
  form_data: {
    car: {
      id: string;
      name: string;
    };
    dates: {
      start: string;
      end: string;
      days: number;
    };
    pricing: {
      season: string;
      grandTotal: number;
    };
  };
  status: string;
  created_at: string;
}

interface Stats {
  total_users: number;
  in_progress: number;
  warm: number;
  hot: number;
  confirmed: number;
  completed: number;
  archive: number;
}

const CRMPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [archiveUsers, setArchiveUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userChats, setUserChats] = useState<ChatMessage[]>([]);
  const [userHistory, setUserHistory] = useState<HistoryEntry[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('in_progress');
  const [period, setPeriod] = useState('month');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [isFromArchive, setIsFromArchive] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatus>('inactive');
  const [newStatus, setNewStatus] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Constants
  const BOT_API_URL = 'http://localhost:5001';

  const COLORS = {
    warm: '#3B82F6',         // Blue-500
    cold: '#F59E0B',         // Amber-500
    bookings: '#F97316',     // Orange-500
    completed: '#10B981',    // Emerald-500
    archive: '#9CA3AF'       // Gray-400
  };

  // Утилита для получения токена
  const getAuthToken = (): string => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = '/login';
      throw new Error('Auth token not found. Please login.');
    }
    return token;
  };

  const fetchStats = async (selectedPeriod?: string) => {
    try {
      const p = selectedPeriod || period;
      const response = await fetch(`/api/crm/stats?period=${p}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async (status: string, selectedPeriod?: string) => {
    setLoading(true);
    try {
      const p = selectedPeriod || period;
      const response = await fetch(`/api/crm/users?status=${status}&period=${p}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchive = async (selectedPeriod?: string) => {
    setLoading(true);
    try {
      const p = selectedPeriod || period;
      const response = await fetch(`/api/crm/archive?period=${p}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setArchiveUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching archive:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserChats = async (userId: number) => {
    try {
      const response = await fetch(`/api/crm/chats/${userId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setUserChats(data.chats);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchUserHistory = async (userId: number) => {
    try {
      const response = await fetch(`/api/crm/user_history/${userId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setUserHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchUserBookings = async (userId: number) => {
    try {
      const response = await fetch(`/api/bookings?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      if (data.status === 'ok' && Array.isArray(data.bookings)) {
        setUserBookings(data.bookings as Booking[]);
      } else {
        setUserBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setUserBookings([]);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    fetchStats(newPeriod);
    if (showArchive) {
      fetchArchive(newPeriod);
    } else {
      fetchUsers(statusFilter, newPeriod);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'archive') {
      setShowArchive(true);
      setStatusFilter('archive');
      fetchArchive(period);
    } else {
      setShowArchive(false);
      setStatusFilter(newStatus);
      fetchUsers(newStatus, period);
    }
  };

  const handleUserClick = async (user: User, fromArchive: boolean = false) => {
    setSelectedUser(user);
    setNewStatus(user.final_status);
    setNoteText('');
    setIsDialogOpen(true);
    setIsFromArchive(fromArchive);
    await fetchUserChats(user.user_id);
    await fetchUserHistory(user.user_id);
    await fetchUserBookings(user.user_id);
  };

  const handleStatusUpdate = async () => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/crm/update_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          user_id: selectedUser.user_id,
          status: newStatus,
          note: noteText
        })
      });

      const data = await response.json();
      if (data.status === 'ok') {
        if (showArchive) {
          fetchArchive(period);
        } else {
          fetchUsers(statusFilter, period);
        }

        await fetchUserHistory(selectedUser.user_id);
        await fetchStats();

        setNoteText('');
        alert('Статус обновлен');
        setSelectedUser({ ...selectedUser, final_status: newStatus, last_note: noteText });
      } else {
        alert('Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Ошибка обновления статуса');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/crm/delete_user/${selectedUser.user_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const data = await response.json();
      if (data.status === 'ok') {
        setUsers(users.filter(u => u.user_id !== selectedUser.user_id));
        await fetchStats();
        setIsDialogOpen(false);
        setShowDeleteDialog(false);
        alert('Запись перемещена в архив');
      } else {
        alert('Ошибка удаления записи');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Ошибка удаления записи');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRestoreUser = async () => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/crm/restore_user/${selectedUser.user_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const data = await response.json();
      if (data.status === 'ok') {
        setArchiveUsers(archiveUsers.filter(u => u.user_id !== selectedUser.user_id));
        await fetchStats();
        setIsDialogOpen(false);
        alert('Пользователь восстановлен');
      } else {
        alert('Ошибка восстановления');
      }
    } catch (error) {
      console.error('Error restoring user:', error);
      alert('Ошибка восстановления');
    } finally {
      setIsUpdating(false);
    }
  };

  // ============================================
  // CLAUDE CONTROL FUNCTIONS
  // ============================================

  const handleStartClaude = async (userId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${BOT_API_URL}/botapi/claude/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        alert('✅ Claude запущен!');
        setClaudeStatus('active');
      } else {
        alert('❌ Ошибка запуска Claude');
      }
    } catch (error) {
      console.error('Failed to start Claude:', error);
      alert('❌ Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseClaude = async (userId: number) => {
    if (!confirm('Приостановить Claude?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${BOT_API_URL}/botapi/dialog/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        alert('⏸️ Claude приостановлен');
        setClaudeStatus('paused');
      } else {
        alert('❌ Ошибка');
      }
    } catch (error) {
      console.error('Failed to pause Claude:', error);
      alert('❌ Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeClaude = async (userId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${BOT_API_URL}/botapi/dialog/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        alert('▶️ Claude возобновлён');
        setClaudeStatus('active');
      } else {
        alert('❌ Ошибка');
      }
    } catch (error) {
      console.error('Failed to resume Claude:', error);
      alert('❌ Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleStopClaude = async (userId: number) => {
    if (!confirm('Завершить диалог? Это нельзя отменить.')) return;

    setLoading(true);
    try {
      const response = await fetch(`${BOT_API_URL}/botapi/dialog/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        alert('🛑 Диалог завершён');
        setClaudeStatus('stopped');
      } else {
        alert('❌ Ошибка');
      }
    } catch (error) {
      console.error('Failed to stop Claude:', error);
      alert('❌ Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'in_progress' || status === 'confirmed') return 'warm';
    if (status === 'awaiting_followup') return 'cold';
    if (status === 'booked' || status === 'hot') return 'bookings';
    if (status === 'completed') return 'completed';
    return 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'in_progress': 'Теплые',
      'confirmed': 'Теплые',
      'awaiting_followup': 'Холодные',
      'booked': 'Заявка',
      'hot': 'Заявка',
      'completed': 'Выполнено'
    };
    return labels[status] || 'Другое';
  };

  // useEffect для начальной загрузки
  useEffect(() => {
    fetchStats('month');
    fetchUsers('in_progress', 'month');
  }, []);

  const filteredUsers = (showArchive ? archiveUsers : users);

  const totalWarm = stats?.in_progress || 0;
  const totalCold = stats?.warm || 0;
  const totalBookings = stats?.hot || 0;
  const totalCompleted = stats?.completed || 0;
  const totalArchive = stats?.archive || 0;

  const totalAll = totalWarm + totalCold + totalBookings + totalCompleted + totalArchive;

  const successfulBookings = totalBookings + totalCompleted;
  const conversion = totalAll > 0 ? ((successfulBookings / totalAll) * 100).toFixed(1) : '0.0';

  const pieData = [
    { name: 'Теплые', value: totalWarm, color: COLORS.warm },
    { name: 'Холодные', value: totalCold, color: COLORS.cold },
    { name: 'Заявки', value: totalBookings, color: COLORS.bookings },
    { name: 'Выполнено', value: totalCompleted, color: COLORS.completed },
  ].filter(item => item.value > 0);

  if (totalArchive > 0) {
    pieData.push({ name: 'Архив', value: totalArchive, color: COLORS.archive });
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Sunny Rentals" className="h-10 w-10 object-contain" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                Sunny Rentals CRM
              </h1>
            </div>
            <Badge variant="outline" className="text-xs">EN</Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Period Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: 'today', label: 'Сегодня' },
            { value: 'week', label: 'Неделя' },
            { value: '2weeks', label: '2 недели' },
            { value: 'month', label: 'Месяц' },
            { value: 'all', label: 'Все' }
          ].map(p => (
            <Badge
              key={p.value}
              variant={period === p.value ? 'default' : 'outline'}
              className={`cursor-pointer px-4 py-2 ${period === p.value
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'hover:bg-blue-50 text-gray-700 border-gray-300'
                }`}
              onClick={() => handlePeriodChange(p.value)}
            >
              {p.label}
            </Badge>
          ))}
        </div>

        {/* Buttons: Archive + Conversion */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={showArchive ? 'default' : 'outline'}
            onClick={() => handleStatusChange('archive')}
            className={showArchive ? 'bg-slate-600 hover:bg-slate-700 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}
          >
            Архив ({totalArchive})
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowConversionModal(true)}
            className="border-emerald-400 text-emerald-700 hover:bg-emerald-50"
          >
            Конверсия
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Теплые */}
          <Card
            className={`cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg ${statusFilter === 'in_progress'
                ? 'ring-2 ring-blue-400'
                : ''
              }`}
            onClick={() => handleStatusChange('in_progress')}
          >
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 mb-1">Теплые</div>
              <div className="text-3xl font-bold text-gray-800">{totalWarm}</div>
              <div className="text-xs text-gray-500 mt-1">
                {totalAll > 0 ? ((totalWarm / totalAll) * 100).toFixed(1) : '0'}%
              </div>
            </CardContent>
          </Card>

          {/* Холодные */}
          <Card
            className={`cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg ${statusFilter === 'warm'
                ? 'ring-2 ring-amber-400'
                : ''
              }`}
            onClick={() => handleStatusChange('warm')}
          >
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 mb-1">Холодные</div>
              <div className="text-3xl font-bold text-gray-800">{totalCold}</div>
              <div className="text-xs text-gray-500 mt-1">
                {totalAll > 0 ? ((totalCold / totalAll) * 100).toFixed(1) : '0'}%
              </div>
            </CardContent>
          </Card>

          {/* Заявки */}
          <Card
            className={`cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg ${statusFilter === 'hot'
                ? 'ring-2 ring-orange-400'
                : ''
              }`}
            onClick={() => handleStatusChange('hot')}
          >
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 mb-1">Заявки</div>
              <div className="text-3xl font-bold text-gray-800">{totalBookings}</div>
              <div className="text-xs text-gray-500 mt-1">
                {totalAll > 0 ? ((totalBookings / totalAll) * 100).toFixed(1) : '0'}%
              </div>
            </CardContent>
          </Card>

          {/* Выполнено */}
          <Card
            className={`cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg ${statusFilter === 'completed'
                ? 'ring-2 ring-emerald-400'
                : ''
              }`}
            onClick={() => handleStatusChange('completed')}
          >
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 mb-1">Выполнено</div>
              <div className="text-3xl font-bold text-gray-800">{totalCompleted}</div>
              <div className="text-xs text-gray-500 mt-1">
                {totalAll > 0 ? ((totalCompleted / totalAll) * 100).toFixed(1) : '0'}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings List */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600 mb-3">
            Записей: {filteredUsers.length}
          </div>

          {loading ? (
            <div className="text-center py-12">Загрузка...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => {
                const statusVariant = getStatusBadgeVariant(user.final_status);
                const badgeColor =
                  statusVariant === 'warm' ? 'bg-blue-600' :
                    statusVariant === 'cold' ? 'bg-amber-600' :
                      statusVariant === 'bookings' ? 'bg-orange-600' :
                        statusVariant === 'completed' ? 'bg-emerald-600' : 'bg-gray-600';

                return (
                  <Card
                    key={user.user_id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white"
                    onClick={() => handleUserClick(user, showArchive)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-bold text-gray-800">
                            {user.username ? `@${user.username}` : `ID: ${user.user_id}`}
                          </span>
                        </div>
                        <Badge className={`text-xs text-white ${badgeColor}`}>
                          {getStatusLabel(user.final_status)}
                        </Badge>
                      </div>

                      {user.car_interested && (
                        <div className="text-sm mb-2 font-medium text-blue-700">
                          {user.car_interested}
                        </div>
                      )}

                      {user.dates_selected && (
                        <div className="text-xs mb-2 text-amber-700 font-medium">
                          {formatDate(user.dates_selected.start)} - {formatDate(user.dates_selected.end)}
                          <span className="ml-2 text-gray-400">({user.dates_selected.days}д)</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-3 pt-3 border-t">
                        <span className="text-xs text-gray-400">{formatTimestamp(user.timestamp)}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserClick(user, showArchive);
                            }}
                          >
                            <MessageSquare className="w-4 h-4 text-gray-600" />
                          </Button>
                          {!showArchive && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Archive className="w-4 h-4 text-gray-400" />
                            </Button>
                          )}
                          {(user.final_status === 'in_progress' || user.final_status === 'awaiting_followup') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartClaude(user.user_id);
                              }}
                            >
                              <Play className="w-4 h-4 text-gray-600" />
                            </Button>
                          )}
                          {claudeStatus !== 'paused' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePauseClaude(user.user_id);
                              }}
                            >
                              <Pause className="w-4 h-4 text-gray-600" />
                            </Button>
                          )}
                          {claudeStatus === 'paused' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResumeClaude(user.user_id);
                              }}
                            >
                              <Play className="w-4 h-4 text-gray-600" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStopClaude(user.user_id);
                            }}
                          >
                            <StopCircle className="w-4 h-4 text-gray-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User Dialog - остальной код без изменений */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {selectedUser?.username ? `@${selectedUser.username}` : `ID: ${selectedUser?.user_id}`}
              {isFromArchive && <Badge variant="secondary">Архив</Badge>}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Инфо</TabsTrigger>
                <TabsTrigger value="bookings">Брони ({userBookings.length})</TabsTrigger>
                <TabsTrigger value="chat">Диалог</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[60vh]">
                <TabsContent value="info" className="space-y-3 p-1">
                  <Card>
                    <CardContent className="p-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Статус:</span>
                        <Badge className="bg-gray-600 text-white">
                          {getStatusLabel(selectedUser.final_status)}
                        </Badge>
                      </div>

                      {selectedUser.car_interested && (
                        <div>
                          <span className="text-gray-600">Авто:</span>
                          <p className="font-medium">{selectedUser.car_interested}</p>
                        </div>
                      )}

                      {selectedUser.dates_selected && (
                        <div>
                          <span className="text-gray-600">Даты:</span>
                          <p className="font-medium">
                            {formatDate(selectedUser.dates_selected.start)} - {formatDate(selectedUser.dates_selected.end)}
                            <span className="text-gray-500 ml-2">({selectedUser.dates_selected.days}д)</span>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {!isFromArchive && (
                    <Card>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { value: 'in_progress', label: 'Теплые', color: 'bg-blue-600' },
                            { value: 'awaiting_followup', label: 'Холодные', color: 'bg-amber-600' },
                            { value: 'booked', label: 'Заявка', color: 'bg-orange-600' },
                            { value: 'completed', label: 'Выполнено', color: 'bg-emerald-600' },
                          ].map(s => (
                            <Badge
                              key={s.value}
                              className={`cursor-pointer px-3 py-1 ${newStatus === s.value
                                  ? `${s.color} text-white`
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              onClick={() => setNewStatus(s.value)}
                            >
                              {s.label}
                            </Badge>
                          ))}
                        </div>

                        <Textarea
                          placeholder="Заметка..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="text-sm h-16"
                        />

                        <Button
                          onClick={handleStatusUpdate}
                          disabled={isUpdating}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Сохранить
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2">
                    {!isFromArchive ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => window.open(`https://t.me/${selectedUser.username}`, '_blank')}
                          disabled={!selectedUser.username}
                          className="flex-1"
                          size="sm"
                        >
                          Telegram
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteDialog(true)}
                          className="flex-1"
                          size="sm"
                        >
                          <Archive className="w-4 h-4 mr-1" />
                          Архив
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleRestoreUser}
                        disabled={isUpdating}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        Восстановить
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="bookings" className="p-1">
                  {userBookings.length > 0 ? (
                    <div className="space-y-2">
                      {userBookings.map((booking) => (
                        <Card key={booking.booking_id}>
                          <CardContent className="p-3 text-sm space-y-1">
                            <p><strong>Машина:</strong> {booking.form_data.car.name}</p>
                            <p><strong>Даты:</strong> {formatDate(booking.form_data.dates.start)} - {formatDate(booking.form_data.dates.end)} ({booking.form_data.dates.days}д)</p>
                            <p><strong>Цена:</strong> {booking.form_data.pricing.grandTotal.toLocaleString()}฿</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-500">Нет бронирований</div>
                  )}
                </TabsContent>

                <TabsContent value="chat" className="p-1">
                  {userChats.length > 0 ? (
                    <div className="space-y-2">
                      {userChats.map((chat, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded-lg text-sm ${chat.role === 'user' ? 'bg-gray-100 ml-4' : 'bg-gray-50 mr-4'
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-xs">
                              {chat.role === 'user' ? 'Клиент' : 'Бот'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(chat.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs whitespace-pre-wrap">{chat.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-500">Нет диалога</div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Переместить в архив?</AlertDialogTitle>
            <AlertDialogDescription>
              Пользователь {selectedUser?.username ? `@${selectedUser.username}` : `ID: ${selectedUser?.user_id}`} будет перемещен в архив.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>В архив</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conversion Modal */}
      <Dialog open={showConversionModal} onOpenChange={setShowConversionModal}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">
              Конверсия: {conversion}%
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6">
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-700 space-y-1">
                    <div><strong>Формула:</strong> (Заявки + Выполнено) / Всего × 100%</div>
                    <div><strong>Результат:</strong> {successfulBookings} успешных броней из {totalAll} лидов</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-1.5 text-sm">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.warm }}></div>
                    <span>Теплые</span>
                  </div>
                  <span className="font-semibold">{totalWarm}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.cold }}></div>
                    <span>Холодные</span>
                  </div>
                  <span className="font-semibold">{totalCold}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.bookings }}></div>
                    <span>Заявки</span>
                  </div>
                  <span className="font-semibold">{totalBookings}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.completed }}></div>
                    <span>Выполнено</span>
                  </div>
                  <span className="font-semibold">{totalCompleted}</span>
                </div>
                {totalArchive > 0 && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.archive }}></div>
                      <span>Архив</span>
                    </div>
                    <span className="font-semibold">{totalArchive}</span>
                  </div>
                )}
              </div>

              <Button
                onClick={() => setShowConversionModal(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Закрыть
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMPage;