import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Mail,
  Send,
  X,
  Check,
  AlertCircle,
  Clock,
  ArrowRightLeft,
} from "lucide-react";

export interface MemberItem {
  id: string;
  project_id: string;
  user_id: string;
  email?: string;
  full_name?: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  created_at: string;
}

export interface ProjectInvitationItem {
  id: string;
  project_id: string;
  project_name?: string;
  inviter_id: string;
  inviter_email?: string;
  invitee_email: string;
  role: string;
  status: string;
  created_at: string;
}

interface ShareModalProps {
  projectId: string;
  projectName: string;
  currentUserRole: "OWNER" | "EDITOR" | "VIEWER";
  onClose: () => void;
  onOwnershipTransferred?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  projectId,
  projectName,
  currentUserRole,
  onClose,
  onOwnershipTransferred,
}) => {
  const isOwner = currentUserRole === "OWNER";

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Transfer ownership
  const [transferTargetId, setTransferTargetId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    fetchMembersAndInvitations();
  }, [projectId]);

  const fetchMembersAndInvitations = async () => {
    setIsLoading(true);
    try {
      const memRes = await api.get(`/projects/${projectId}/members`);
      setMembers(memRes.data);

      if (isOwner) {
        const invRes = await api.get(`/projects/${projectId}/invitations`);
        setInvitations(invRes.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setFeedback(null);
    setIsSending(true);

    try {
      await api.post(`/projects/${projectId}/invitations`, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      setInviteEmail("");
      setFeedback({
        type: "success",
        text: `Invitation created for ${inviteEmail.trim().toLowerCase()}. The recipient can accept it in their Invitations inbox (or upon sign-up).`,
      });
      fetchMembersAndInvitations();
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message || err.message || "Failed to send invitation.";
      setFeedback({ type: "error", text: msg });
    } finally {
      setIsSending(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "EDITOR" | "VIEWER") => {
    try {
      await api.patch(`/projects/${projectId}/members/${userId}`, { role: newRole });
      fetchMembersAndInvitations();
    } catch (err: any) {
      alert("Failed to update role: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this collaborator from the project?")) return;
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      fetchMembersAndInvitations();
    } catch (err: any) {
      alert("Failed to remove member: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await api.delete(`/projects/${projectId}/invitations/${invitationId}`);
      fetchMembersAndInvitations();
    } catch (err: any) {
      alert("Failed to revoke invitation: " + (err.response?.data?.detail?.message || err.message));
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTargetId) return;
    const target = members.find((m) => m.user_id === transferTargetId);
    if (!confirm(`Are you sure you want to transfer project ownership to ${target?.email || "this member"}? You will be demoted to Editor.`)) return;

    setIsTransferring(true);
    try {
      await api.post(`/projects/${projectId}/transfer-ownership`, {
        new_owner_user_id: transferTargetId,
      });
      alert("Ownership transferred successfully.");
      onOwnershipTransferred?.();
      onClose();
    } catch (err: any) {
      alert("Failed to transfer ownership: " + (err.response?.data?.detail?.message || err.message));
    } finally {
      setIsTransferring(false);
    }
  };

  const otherMembers = members.filter((m) => m.role !== "OWNER");

  return (
    <div className="fixed inset-0 bg-raven-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-raven-900 border border-raven-700 rounded-2xl max-w-xl w-full p-6 shadow-modal space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-raven-800 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-apricot-500" />
            <div>
              <h3 className="font-semibold text-seagrass-50 text-base">Collaborate on Project</h3>
              <p className="text-[11px] font-mono text-seagrass-400">"{projectName}"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-raven-800 flex items-center justify-center text-seagrass-400 hover:text-seagrass-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1 text-xs">
          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 ${
                feedback.type === "success"
                  ? "bg-semantic-success/10 border-semantic-success/30 text-semantic-success"
                  : "bg-semantic-error/10 border-semantic-error/30 text-semantic-error"
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{feedback.text}</span>
              <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Section 1: In-App Invite Form (Owner Only) */}
          {isOwner ? (
            <div className="p-4 rounded-xl bg-raven-850 border border-raven-750 space-y-3">
              <div className="font-semibold text-seagrass-100 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-apricot-500" />
                <span>Invite New Collaborator</span>
              </div>
              <form onSubmit={handleSendInvite} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-3.5 h-3.5 text-seagrass-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      required
                      className="w-full bg-raven-950 border border-raven-700 focus:border-apricot-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-seagrass-50 font-sans focus:outline-none"
                    />
                  </div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="bg-raven-950 border border-raven-700 focus:border-apricot-500 rounded-lg px-3 py-1.5 text-xs text-seagrass-200 font-mono focus:outline-none"
                  >
                    <option value="EDITOR">Editor (Can edit)</option>
                    <option value="VIEWER">Viewer (Read-only)</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isSending || !inviteEmail.trim()}
                    className="px-4 py-1.5 rounded-lg bg-apricot-500 hover:bg-apricot-400 disabled:opacity-40 text-raven-950 font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-surface"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSending ? "Sending..." : "Invite"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-seagrass-400">
                  Unregistered emails can also be invited; the invitation will be claimed when they create an account.
                </p>
              </form>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-raven-850/50 border border-raven-800 text-seagrass-400 text-xs">
              You are collaborating as an <span className="font-semibold text-seagrass-200">{currentUserRole}</span>. Only the project owner can invite new members or manage roles.
            </div>
          )}

          {/* Section 2: Active Members List */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-seagrass-100 flex items-center justify-between">
              <span>Project Members ({members.length})</span>
            </h4>

            {isLoading ? (
              <div className="py-6 text-center text-seagrass-400 font-mono text-xs animate-pulse">
                Loading members...
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-xl bg-raven-850 border border-raven-750 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-raven-750 border border-raven-700 flex items-center justify-center font-mono text-seagrass-100 text-xs font-bold">
                        {member.full_name ? member.full_name.charAt(0).toUpperCase() : member.email?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="font-medium text-seagrass-50">
                          {member.full_name || member.email || "Collaborator"}
                        </div>
                        {member.email && (
                          <div className="text-[10px] font-mono text-seagrass-400">{member.email}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner && member.role !== "OWNER" ? (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.user_id, e.target.value as any)}
                            className="bg-raven-950 border border-raven-700 rounded px-2 py-1 text-[11px] font-mono text-seagrass-200 focus:outline-none"
                          >
                            <option value="EDITOR">EDITOR</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="p-1 rounded hover:bg-[#EF4444]/20 text-seagrass-400 hover:text-[#EF4444]"
                            title="Remove collaborator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            member.role === "OWNER"
                              ? "bg-apricot-500/15 text-apricot-400 border border-apricot-500/30"
                              : "bg-seagrass-400/15 text-seagrass-300 border border-seagrass-400/30"
                          }`}
                        >
                          {member.role}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Pending Invitations for this project (Owner only) */}
          {isOwner && invitations.filter((i) => i.status === "PENDING").length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-raven-800">
              <h4 className="font-semibold text-seagrass-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-apricot-500" />
                <span>Pending Invitations ({invitations.filter((i) => i.status === "PENDING").length})</span>
              </h4>
              <div className="space-y-1.5">
                {invitations
                  .filter((i) => i.status === "PENDING")
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="p-2.5 rounded-lg bg-raven-850 border border-raven-750 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="space-y-0.5">
                        <span className="text-seagrass-200 font-sans">{inv.invitee_email}</span>
                        <div className="text-[10px] text-seagrass-500">Role: {inv.role}</div>
                      </div>
                      <button
                        onClick={() => handleRevokeInvitation(inv.id)}
                        className="px-2 py-1 rounded bg-raven-950 hover:bg-[#EF4444]/20 text-[#EF4444] text-[10px] border border-raven-750"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Section 4: Transfer Ownership (Owner Only) */}
          {isOwner && otherMembers.length > 0 && (
            <div className="p-3.5 rounded-xl bg-raven-850/50 border border-raven-800 space-y-2 pt-3">
              <div className="font-semibold text-seagrass-200 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-apricot-500" />
                <span>Transfer Project Ownership</span>
              </div>
              <p className="text-[11px] text-seagrass-400">
                Transfer full owner privileges to an active collaborator. You will become an Editor.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  className="flex-1 bg-raven-950 border border-raven-700 rounded-lg px-3 py-1.5 text-xs text-seagrass-200 font-sans focus:outline-none"
                >
                  <option value="">Select a collaborator...</option>
                  {otherMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name || m.email || m.user_id} ({m.role})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTransferOwnership}
                  disabled={!transferTargetId || isTransferring}
                  className="px-3 py-1.5 rounded-lg bg-raven-750 hover:bg-raven-700 border border-raven-700 text-seagrass-100 disabled:opacity-40 font-semibold text-xs shrink-0"
                >
                  {isTransferring ? "Transferring..." : "Transfer"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-raven-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-raven-800 hover:bg-raven-750 border border-raven-700 text-seagrass-100 text-xs font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
