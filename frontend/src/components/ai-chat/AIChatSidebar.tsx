import React, { useState, useRef, useEffect } from 'react'
import { useIntl } from 'react-intl'
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  MessageSquareText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface Conversation {
  id: string
  title: string
  messageCount: number
  updatedAt: string
}

type DateGroup = 'today' | 'yesterday' | 'last7Days' | 'last30Days' | 'older'

interface AIChatSidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  isLoading?: boolean
}

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDiff = Math.floor((today.getTime() - itemDay.getTime()) / 86400000)

  if (dayDiff === 0) return 'today'
  if (dayDiff === 1) return 'yesterday'
  if (dayDiff <= 7) return 'last7Days'
  if (dayDiff <= 30) return 'last30Days'
  return 'older'
}

function groupConversations(conversations: Conversation[]) {
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  const groups: Partial<Record<DateGroup, Conversation[]>> = {}
  for (const c of sorted) {
    const group = getDateGroup(c.updatedAt)
    const groupItems = groups[group] ?? []
    groupItems.push(c)
    groups[group] = groupItems
  }

  const order: DateGroup[] = ['today', 'yesterday', 'last7Days', 'last30Days', 'older']
  return order.flatMap(key => {
    const items = groups[key] ?? []
    return items.length > 0 ? [{ label: key, items }] : []
  })
}

export function AIChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  isLoading,
}: AIChatSidebarProps) {
  const intl = useIntl()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<DateGroup, boolean>>({
    today: true,
    yesterday: true,
    last7Days: true,
    last30Days: true,
    older: true,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editingId])

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groups = groupConversations(filtered)

  const toggleGroup = (label: DateGroup) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id)
    setEditValue(conv.title)
  }

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim())
    }
    setEditingId(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') {
      setEditingId(null)
      setEditValue('')
    }
  }

  return (
    <div className="w-full min-w-60 bg-[#FAF9F5] flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[rgba(31,30,29,0.08)]">
        <button
          onClick={onNew}
          className="flex items-center justify-center gap-2 h-[36px] px-4 rounded-[9.6px] bg-[#1F1E1D] text-white text-[14px] font-normal hover:bg-[#0A0A0A] transition-colors"
        >
          <Plus className="h-4 w-4" />
          {intl.formatMessage({ id: 'modules.aiChat.sidebar.newChat', defaultMessage: 'New chat' })}
        </button>
      </div>

      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#73726C]" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={intl.formatMessage({ id: 'modules.aiChat.sidebar.searchPlaceholder', defaultMessage: 'Search conversations' })}
            className="w-full h-9 pl-8 pr-3 rounded-[9.6px] border border-[rgba(31,30,29,0.12)] bg-white text-[13px] text-[#1F1E1D] placeholder-[#73726C] outline-none focus:border-[rgba(31,30,29,0.3)] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-2 mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-9 rounded-lg bg-[rgba(31,30,29,0.04)] animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 mt-4">
            <MessageSquareText className="h-8 w-8 text-[#73726C] mb-3 opacity-40" />
            <p className="text-[14px] text-[#73726C] leading-[20px]">
              {searchTerm
                ? intl.formatMessage({ id: 'modules.aiChat.sidebar.noResults', defaultMessage: 'No conversations found' })
                : intl.formatMessage({ id: 'modules.aiChat.sidebar.empty', defaultMessage: 'No conversations yet' })}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 mt-1">
            {groups.map(group => (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center gap-1 px-2 py-1.5 w-full text-left group"
                >
                  {expandedGroups[group.label] !== false ? (
                    <ChevronDown className="h-3 w-3 text-[#73726C]" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-[#73726C]" />
                  )}
                  <span className="text-[11px] font-medium text-[#73726C] uppercase tracking-wider">
                    {intl.formatMessage({
                      id: `modules.aiChat.sidebar.groups.${group.label}`,
                      defaultMessage: group.label,
                    })}
                  </span>
                </button>

                {expandedGroups[group.label] !== false && (
                  <div className="flex flex-col gap-0.5">
                    {group.items.map(conv => {
                      const isActive = conv.id === activeId
                      const isEditing = conv.id === editingId

                      return (
                        <div
                          key={conv.id}
                          onClick={() => !isEditing && onSelect(conv.id)}
                          className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-white border border-[rgba(31,30,29,0.08)] shadow-[rgba(0,0,0,0.03)_0px_1px_4px_0px]'
                              : 'hover:bg-[rgba(31,30,29,0.03)]'
                          }`}
                        >
                          <MessageSquareText
                            className={`h-3.5 w-3.5 flex-shrink-0 ${
                              isActive ? 'text-[#D97757]' : 'text-[#73726C]'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <input
                                ref={editRef}
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={commitRename}
                                className="w-full text-[13px] text-[#1F1E1D] bg-transparent outline-none border-b border-[#D97757] pb-0.5"
                              />
                            ) : (
                              <p className="text-[13px] text-[#1F1E1D] truncate leading-[18px]">
                                {conv.title || intl.formatMessage({ id: 'modules.aiChat.sidebar.newConversation', defaultMessage: 'New conversation' })}
                              </p>
                            )}
                          </div>

                          {!isEditing && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  startRename(conv)
                                }}
                                className="p-1 rounded hover:bg-[rgba(31,30,29,0.06)] text-[#73726C] hover:text-[#1F1E1D] transition-colors"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  onDelete(conv.id)
                                }}
                                className="p-1 rounded hover:bg-[rgba(224,30,90,0.08)] text-[#73726C] hover:text-[#E01E5A] transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
