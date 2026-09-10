import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Ticket,
  Calendar,
  Scale,
  Award,
  IndianRupee,
  Truck,
  AlertCircle,
  X,
  MessageSquare,
  Smartphone
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.tsx';
import { NotificationItem, NotificationType } from '../types.ts';

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 45) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return 'Recently';
  }
}

// Icon selector per notification type
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'TOKEN_CALLED':
      return <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Bell className="w-4 h-4 animate-bounce" /></div>;
    case 'TOKEN_APPROACHING':
      return <div className="p-2 bg-amber-100 text-amber-700 rounded-lg"><Ticket className="w-4 h-4" /></div>;
    case 'TOKEN_BOOKED':
    case 'TOKEN_COMPLETED':
    case 'TOKEN_CANCELLED':
      return <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Ticket className="w-4 h-4" /></div>;
    case 'SLOT_CONFIRMED':
    case 'SLOT_RESCHEDULED':
    case 'SLOT_CANCELLED':
      return <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><Calendar className="w-4 h-4" /></div>;
    case 'PROCUREMENT_STATUS_CHANGED':
      return <div className="p-2 bg-amber-100 text-amber-700 rounded-lg"><Scale className="w-4 h-4" /></div>;
    case 'PROCUREMENT_COMPLETED':
      return <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Award className="w-4 h-4" /></div>;
    case 'PAYMENT_STATUS_CHANGED':
      return <div className="p-2 bg-teal-100 text-teal-700 rounded-lg"><IndianRupee className="w-4 h-4" /></div>;
    default:
      return <div className="p-2 bg-slate-100 text-slate-700 rounded-lg"><AlertCircle className="w-4 h-4" /></div>;
  }
}

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const displayedNotifications = notifications.filter(n => (filter === 'unread' ? !n.isRead : true));

  return (
    <div className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        ref={buttonRef}
        onClick={() => {
          if (!isOpen) {
            fetchNotifications();
          }
          setIsOpen(!isOpen);
        }}
        className="relative p-2 text-emerald-100 hover:text-white hover:bg-emerald-700/60 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
        title="Notifications / सूचनाएं"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-rose-600 rounded-full ring-2 ring-emerald-800 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id="notification-dropdown-panel"
          ref={panelRef}
          className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[550px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Panel Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  id="mark-all-read-btn"
                  onClick={() => markAllAsRead()}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-medium px-2 py-1 rounded hover:bg-emerald-50 transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Read all</span>
                </button>
              )}
              <button
                id="close-notifications-btn"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 px-4 bg-white text-xs">
            <button
              id="filter-all-btn"
              onClick={() => setFilter('all')}
              className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                filter === 'all'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              id="filter-unread-btn"
              onClick={() => setFilter('unread')}
              className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                filter === 'unread'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-[380px]">
            {displayedNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700">No notifications</p>
                <p className="text-xs text-slate-400 mt-1">
                  {filter === 'unread' ? 'All caught up! No unread notifications.' : 'Alerts for tokens, slots, and procurement will appear here.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((n: NotificationItem) => (
                <div
                  key={n._id}
                  id={`notification-item-${n._id}`}
                  onClick={() => {
                    if (!n.isRead) markAsRead(n._id);
                  }}
                  className={`p-3.5 flex gap-3 transition-colors cursor-pointer group ${
                    n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-emerald-50/40 hover:bg-emerald-50/70'
                  }`}
                >
                  <div className="flex-shrink-0 pt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className={`text-xs leading-tight ${n.isRead ? 'font-medium text-slate-800' : 'font-semibold text-slate-900'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap pl-1">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                      {n.message}
                    </p>

                    {/* Metadata badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {n.referenceId && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono font-medium">
                          {n.referenceId}
                        </span>
                      )}

                      {/* Channel delivery readiness */}
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px]">
                        <Smartphone className="w-3 h-3" />
                        In-App
                      </span>

                      {!n.isRead && (
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-auto" title="Unread" />
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      id={`dismiss-notification-${n._id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n._id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                      title="Dismiss notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-center flex items-center justify-between text-[11px] text-slate-500">
            <span>Kisan Alert Service</span>
            <span className="text-emerald-700 font-medium">SMS / WhatsApp Ready</span>
          </div>
        </div>
      )}
    </div>
  );
};
