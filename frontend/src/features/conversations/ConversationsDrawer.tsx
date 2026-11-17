import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import {
  MessageSquare,
  Plus,
  Archive,
  RotateCcw,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronRight,
  Clock,
  Sparkles,
  User,
  Bot,
  ExternalLink,
} from "lucide-react";

export interface ConversationItem {
  id: string;
  user_id: string;
  project_id?: string;
  title: string;
  is_archived: boolean;
  message_count?: number;
  latest_message?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  generation_id?: string;
  metadata_json: Record<string, any>;
  estimated_tokens?: number;
  created_at: string;
}

interface ConversationsDrawerProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onClose: () => void;
}

export const ConversationsDrawer: React.FC<ConversationsDrawerProps> = ({
  activeConversationId,
  onSelectConversation,
  onClose,
}) => {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "messages">("list");
  const [activeMessages, setActiveMessages] = useState<MessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // New conversation & rename state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  useEffect(() => {
    fetchConversations();
  }, [tab]);

  useEffect(() => {
    if (activeConversationId && viewMode === "messages") {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, viewMode]);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/conversations?is_archived=${tab === "archived"}`);
      setConversations(res.data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await api.get(`/conversations/${convId}`);
      setActiveMessages(res.data.messages || []);
    } catch {
      // Fallback
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await api.post("/conversations", { title: newTitle.trim() });
      setNewTitle("");
      setIsCreating(false);
      onSelectConversation(res.data.id);
      fetchConversations();
    } catch (err: any) {
      alert("Failed to create conversation: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  const handleRename = async (id: string) => {
    if (!editingTitle.trim()) return;
    try {
      await api.patch(`/conversations/${id}`, { title: editingTitle.trim() });
      setEditingId(null);
      fetchConversations();
    } catch (err: any) {
      alert("Failed to rename conversation: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  const handleToggleArchive = async (id: string, currentArchived: boolean) => {
    try {
      await api.patch(`/conversations/${id}`, { is_archived: !currentArchived });
      fetchConversations();
    } catch (err: any) {
      alert("Failed to update conversation: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this conversation thread? Generated images will be preserved.")) return;
    try {
      await api.delete(`/conversations/${id}`);
      if (activeConversationId === id) {
        onSelectConversation("");
      }
      fetchConversations();
    } catch (err: any) {
      alert("Failed to delete conversation: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  const currentActiveConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="absolute inset-y-0 left-14 w-88 md:w-96 bg-raven-900 border-r border-raven-700 shadow-modal z-30 flex flex-col font-sans">
      {/* Drawer Header */}
      <div className="p-4 border-b border-raven-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-apricot-500" />
          <span className="text-xs font-mono uppercase font-semibold text-seagrass-50">
            {viewMode === "list" ? "Creative Threads" : "Thread Dialogue"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {viewMode === "messages" ? (
            <button
              onClick={() => setViewMode("list")}
              className="text-xs font-mono text-seagrass-300 hover:text-seagrass-50 px-2 py-1 rounded bg-raven-800"
            >
              Back to list
            </button>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="p-1.5 rounded-lg bg-apricot-500 hover:bg-apricot-400 text-raven-950 transition-colors"
              title="New Conversation"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-seagrass-400 hover:text-seagrass-100 hover:bg-raven-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode 1: Conversations List */}
      {viewMode === "list" && (
        <>
          {/* Active vs Archived Sub-tabs */}
          <div className="flex border-b border-raven-800 bg-raven-850 px-4 text-xs font-mono">
            <button
              onClick={() => setTab("active")}
              className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                tab === "active"
                  ? "border-apricot-500 text-seagrass-50"
                  : "border-transparent text-seagrass-400 hover:text-seagrass-200"
              }`}
            >
              Active Threads
            </button>
            <button
              onClick={() => setTab("archived")}
              className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                tab === "archived"
                  ? "border-apricot-500 text-seagrass-50"
                  : "border-transparent text-seagrass-400 hover:text-seagrass-200"
              }`}
            >
              Archived
            </button>
          </div>

          {/* Inline Create Input */}
          {isCreating && (
            <div className="p-3 bg-raven-850 border-b border-raven-700 flex items-center gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateConversation()}
                placeholder="Conversation title..."
                autoFocus
                className="flex-1 bg-raven-950 border border-apricot-500 rounded px-2.5 py-1 text-xs text-seagrass-50 font-sans focus:outline-none"
              />
              <button
                onClick={handleCreateConversation}
                className="p-1.5 rounded bg-apricot-500 hover:bg-apricot-400 text-raven-950"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1.5 rounded text-seagrass-400 hover:text-seagrass-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Conversations Thread List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-xs font-mono text-seagrass-400 animate-pulse">
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 text-xs text-seagrass-400 space-y-1">
                <p className="font-medium text-seagrass-200">
                  {tab === "active" ? "No active conversations" : "No archived conversations"}
                </p>
                <p className="text-[11px]">
                  {tab === "active"
                    ? "Click '+' above to start a dedicated creative ideation thread."
                    : "Archived threads will appear here."}
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    className={`rounded-xl border p-3 space-y-1.5 transition-all text-xs ${
                      isActive
                        ? "border-apricot-500/70 bg-raven-800 shadow-surface"
                        : "border-raven-750 bg-raven-850 hover:border-seagrass-400/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {editingId === conv.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleRename(conv.id)}
                            autoFocus
                            className="flex-1 bg-raven-950 border border-apricot-500 rounded px-2 py-0.5 text-xs text-seagrass-50 font-sans focus:outline-none"
                          />
                          <button
                            onClick={() => handleRename(conv.id)}
                            className="p-1 rounded bg-apricot-500 text-raven-950"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded text-seagrass-400 hover:text-seagrass-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              onSelectConversation(conv.id);
                              setViewMode("messages");
                            }}
                            className="font-medium text-seagrass-100 hover:text-apricot-400 truncate text-left flex-1"
                            title={conv.title}
                          >
                            {conv.title}
                          </button>
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded bg-apricot-500/15 text-apricot-400 text-[10px] font-mono shrink-0">
                              Current
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {conv.latest_message && (
                      <p className="text-[11px] text-seagrass-400 truncate italic">
                        "{conv.latest_message}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono text-seagrass-500 pt-1 border-t border-raven-750/60">
                      <span>{conv.message_count ?? 0} messages</span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(conv.id);
                            setEditingTitle(conv.title);
                          }}
                          className="p-1 rounded hover:bg-raven-750 text-seagrass-400 hover:text-seagrass-100"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleToggleArchive(conv.id, conv.is_archived)}
                          className="p-1 rounded hover:bg-raven-750 text-seagrass-400 hover:text-seagrass-100"
                          title={conv.is_archived ? "Restore to active" : "Archive"}
                        >
                          {conv.is_archived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => handleDelete(conv.id)}
                          className="p-1 rounded hover:bg-[#EF4444]/20 text-seagrass-400 hover:text-[#EF4444]"
                          title="Delete thread"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Mode 2: Chronological Message Dialogue */}
      {viewMode === "messages" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 bg-raven-850 border-b border-raven-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-seagrass-100 truncate">
              {currentActiveConv?.title || "Active Conversation"}
            </span>
            <button
              onClick={() => {
                if (activeConversationId) fetchMessages(activeConversationId);
              }}
              className="text-[10px] font-mono text-apricot-500 hover:underline"
            >
              Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoadingMessages ? (
              <div className="text-center py-12 text-xs font-mono text-seagrass-400 animate-pulse">
                Loading messages...
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="text-center py-12 text-xs text-seagrass-400 space-y-1">
                <p className="font-medium text-seagrass-200">No messages yet in this thread</p>
                <p className="text-[11px]">
                  Submit a prompt in the composer to record creative explorations into this thread.
                </p>
              </div>
            ) : (
              activeMessages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col space-y-1 ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-seagrass-500">
                      {isUser ? (
                        <>
                          <span>Creator</span>
                          <User className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <Bot className="w-3 h-3 text-apricot-500" />
                          <span className="text-apricot-400">Reve Diffusion</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isUser
                          ? "bg-raven-750 text-seagrass-50 border border-raven-700"
                          : "bg-raven-850 text-seagrass-100 border border-raven-750"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Assistant Image Artifact Preview if linked to generation */}
                      {msg.metadata_json?.image_url && (
                        <div className="mt-2.5 rounded-lg overflow-hidden border border-raven-700 aspect-square max-w-[180px] bg-raven-950">
                          <img
                            src={msg.metadata_json.image_url}
                            alt="Generated Output"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Metadata tag */}
                      {msg.estimated_tokens ? (
                        <div className="mt-1.5 text-[9px] font-mono text-seagrass-500 text-right">
                          ~{msg.estimated_tokens} tokens
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
