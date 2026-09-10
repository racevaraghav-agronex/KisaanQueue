import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Ticket,
  Calendar,
  Scale,
  Award,
  IndianRupee,
  AlertCircle,
  Smartphone,
  MessageSquare,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.tsx';
import { NotificationItem, NotificationType } from '../types.ts';

function formatFullTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

function getIconForType(type: NotificationType) {
  switch (type) {
    case 'TOKEN_CALLED':
      return <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl"><Bell className="w-5 h-5 animate-bounce" /></div>;
    case 'TOKEN_APPROACHING':
      return <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl"><Ticket className="w-5 h-5" /></div>;
    case 'TOKEN_BOOKED':
    case 'TOKEN_COMPLETED':
    case 'TOKEN_CANCELLED':
      return <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl"><Ticket className="w-5 h-5" /></div>;
    case 'SLOT_CONFIRMED':
    case 'SLOT_RESCHEDULED':
    case 'SLOT_CANCELLED':
      return <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl"><Calendar className="w-5 h-5" /></div>;
    case 'PROCUREMENT_STATUS_CHANGED':
      return <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl"><Scale className="w-5 h-5" /></div>;
    case 'PROCUREMENT_COMPLETED':
      return <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl"><Award className="w-5 h-5" /></div>;
    case 'PAYMENT_STATUS_CHANGED':
      return <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl"><IndianRupee className="w-5 h-5" /></div>;
    default:
      return <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl"><AlertCircle className="w-5 h-5" /></div>;
  }
}

export const FarmerNotificationsTab: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading, fetchNotifications } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'tokens' | 'slots' | 'procurement' | 'payments'>('all');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'tokens') return n.type.startsWith('TOKEN_');
    if (filter === 'slots') return n.type.startsWith('SLOT_');
    if (filter === 'procurement') return n.type.startsWith('PROCUREMENT_');
    if (filter === 'payments') return n.type === 'PAYMENT_STATUS_CHANGED';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Notification Inbox & Announcements
            </h2>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time updates regarding your queue turn, slot bookings, produce weighment, quality grades, and payment settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              id="tab-mark-all-read-btn"
              onClick={() => markAllAsRead()}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-emerald-200 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          )}

          <button
            id="tab-refresh-notifications-btn"
            onClick={() => fetchNotifications()}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Refresh notifications"
          >
            <Bell className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Badges */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'all', label: `All (${notifications.length})` },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'tokens', label: 'Tokens & Queue' },
          { id: 'slots', label: 'Slot Appointments' },
          { id: 'procurement', label: 'Procurement & Quality' },
          { id: 'payments', label: 'Payments' }
        ].map(tab => (
          <button
            key={tab.id}
            id={`notif-filter-${tab.id}`}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-emerald-800 text-white font-bold shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No notifications found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {filter === 'unread'
                ? 'You have read all your notifications.'
                : 'Updates regarding your booked slots, queue tokens, weighbridge entries, and payment credits will be recorded here.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n: NotificationItem) => (
            <div
              key={n._id}
              id={`farmer-notification-${n._id}`}
              className={`rounded-2xl p-4 border transition-all ${
                n.isRead
                  ? 'bg-white border-slate-200 shadow-xs'
                  : 'bg-emerald-50/50 border-emerald-200 shadow-sm ring-1 ring-emerald-500/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="flex-shrink-0 pt-0.5">
                    {getIconForType(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`text-sm ${n.isRead ? 'font-semibold text-slate-900' : 'font-bold text-slate-950'}`}>
                        {n.title}
                      </h4>
                      {!n.isRead && (
                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold">
                          NEW
                        </span>
                      )}
                      {n.referenceId && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[11px] font-bold rounded-md border border-slate-200">
                          {n.referenceId}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 mt-1.5 leading-relaxed font-normal">
                      {n.message}
                    </p>

                    {/* Metadata & Delivery Channels footer */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                      <span>{formatFullTime(n.createdAt)}</span>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-[10px] font-medium border border-emerald-100">
                          <Smartphone className="w-3 h-3 text-emerald-600" />
                          In-App Delivered
                        </span>
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium" title="Future ready SMS dispatch">
                          <MessageSquare className="w-3 h-3 text-slate-500" />
                          SMS Ready
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!n.isRead && (
                    <button
                      id={`mark-read-btn-${n._id}`}
                      onClick={() => markAsRead(n._id)}
                      className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    id={`delete-notif-btn-${n._id}`}
                    onClick={() => deleteNotification(n._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
