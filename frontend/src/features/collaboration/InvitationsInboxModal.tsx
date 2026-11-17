import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import {
  Bell,
  Check,
  X,
  Folder,
  User,
  Shield,
  Clock,
  AlertCircle,
} from "lucide-react";
import { ProjectInvitationItem } from "./ShareModal";

interface InvitationsInboxModalProps {
  onClose: () => void;
  onInvitationResolved: () => void;
}

export const InvitationsInboxModal: React.FC<InvitationsInboxModalProps> = ({
  onClose,
  onInvitationResolved,
}) => {
  const [invitations, setInvitations] = useState<ProjectInvitationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/invitations");
      setInvitations(res.data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (invId: string) => {
    setActionLoadingId(invId);
    try {
      await api.post(`/invitations/${invId}/accept`);
      setFeedback("Invitation accepted! Project added to your workspaces.");
      fetchInvitations();
      onInvitationResolved();
    } catch (err: any) {
      alert("Failed to accept invitation: " + (err.response?.data?.detail?.message || err.message));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (invId: string) => {
    setActionLoadingId(invId);
    try {
      await api.post(`/invitations/${invId}/reject`);
      fetchInvitations();
      onInvitationResolved();
    } catch (err: any) {
      alert("Failed to reject invitation: " + (err.response?.data?.detail?.message || err.message));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-raven-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-raven-900 border border-raven-700 rounded-2xl max-w-lg w-full p-6 shadow-modal space-y-5 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-raven-800 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-apricot-500" />
            <h3 className="font-semibold text-seagrass-50 text-base">Project Invitations</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-raven-800 flex items-center justify-center text-seagrass-400 hover:text-seagrass-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="p-3 rounded-xl bg-semantic-success/10 border border-semantic-success/30 text-semantic-success text-xs flex items-center justify-between shrink-0">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* List of received invitations */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {isLoading ? (
            <div className="py-12 text-center text-seagrass-400 font-mono text-xs animate-pulse">
              Checking for project invitations...
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-12 text-xs text-seagrass-400 space-y-1">
              <p className="font-medium text-seagrass-200">No pending invitations</p>
              <p className="text-[11px]">
                When colleagues invite you to collaborate on their Reve projects, their invitations will appear here.
              </p>
            </div>
          ) : (
            invitations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-xl bg-raven-850 border border-raven-750 space-y-3 text-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-semibold text-seagrass-50 text-sm flex items-center gap-2">
                      <Folder className="w-4 h-4 text-apricot-500 shrink-0" />
                      <span>{inv.project_name || "Untitled Project"}</span>
                    </div>
                    <div className="text-seagrass-400 text-[11px]">
                      Invited by:{" "}
                      <span className="text-seagrass-200 font-mono">{inv.inviter_email || "Project Owner"}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      inv.role === "EDITOR"
                        ? "bg-semantic-success/15 text-semantic-success border border-semantic-success/30"
                        : "bg-seagrass-400/15 text-seagrass-300 border border-seagrass-400/30"
                    }`}
                  >
                    Role: {inv.role}
                  </span>
                </div>

                <div className="pt-2 border-t border-raven-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleReject(inv.id)}
                    disabled={actionLoadingId === inv.id}
                    className="px-3 py-1.5 rounded-lg bg-raven-800 hover:bg-raven-750 border border-raven-700 text-seagrass-300 hover:text-seagrass-100 font-medium text-xs transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(inv.id)}
                    disabled={actionLoadingId === inv.id}
                    className="px-4 py-1.5 rounded-lg bg-apricot-500 hover:bg-apricot-400 text-raven-950 font-semibold text-xs flex items-center gap-1.5 shadow-surface transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{actionLoadingId === inv.id ? "Joining..." : "Accept & Join"}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-raven-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-raven-800 hover:bg-raven-750 border border-raven-700 text-seagrass-100 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
