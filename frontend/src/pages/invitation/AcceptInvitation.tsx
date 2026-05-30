/**
 * Accept Invitation Page
 * Handles accepting team invitations to join a workspace
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  getInvitationByToken,
  acceptInvitation,
  isInvitationExpired,
} from '@/services/invitationService';
import type { InvitationDetails } from '@/types/invitation';
import { Mail, Building2, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useIntl } from 'react-intl';

const AcceptInvitation: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { refreshWorkspaces } = useWorkspace();
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
      return t('invitation.timeRemaining.expired');
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return t('invitation.timeRemaining.days', { count: days });
    }

    if (hours > 0) {
      return t('invitation.timeRemaining.hours', { count: hours });
    }

    return t('invitation.timeRemaining.minutes', { count: minutes });
  };

  const normalizeInvitationError = (rawMessage?: string) => {
    if (!rawMessage) return null;

    const message = rawMessage.toLowerCase();

    if (message.includes('already') && message.includes('accepted')) {
      return t('invitation.errors.alreadyAccepted');
    }

    if (message.includes('revoked') || message.includes('cancelled by the sender')) {
      return t('invitation.errors.revoked');
    }

    if (message.includes('expired')) {
      return t('invitation.errors.expired');
    }

    if (
      (message.includes('sent to') && message.includes('logged in as')) ||
      message.includes('email mismatch')
    ) {
      if (!invitation?.email || !user?.email) {
        return t('invitation.errors.loadFailed');
      }

      return t('invitation.errors.emailMismatch', {
        invitedEmail: invitation?.email || '',
        userEmail: user?.email || '',
      });
    }

    if (
      message.includes('invalid invitation') ||
      message.includes('invalid token') ||
      message.includes('not found')
    ) {
      return t('invitation.errors.loadFailed');
    }

    return null;
  };

  // Get token from URL params or search params
  const invitationToken = token || searchParams.get('token') || '';

  useEffect(() => {
    // If not authenticated and has token, store it and redirect to login
    if (!authLoading && !isAuthenticated && invitationToken) {
      localStorage.setItem('pending_invitation_token', invitationToken);
      navigate(`/auth/login?invitation=${invitationToken}`);
      return;
    }

    // If authenticated, load invitation details
    if (isAuthenticated && invitationToken) {
      loadInvitationDetails();
    }
  }, [isAuthenticated, authLoading, invitationToken]);

  const loadInvitationDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const invitationData = await getInvitationByToken(invitationToken);
      setInvitation(invitationData);

      // Check if invitation email matches user email
      if (user && user.email && invitationData.email &&
          invitationData.email.toLowerCase() !== user.email.toLowerCase()) {
        setError(
          t('invitation.errors.emailMismatch', {
            invitedEmail: invitationData.email,
            userEmail: user.email,
          })
        );
        // Clear invalid token from localStorage
        localStorage.removeItem('pending_invitation_token');
      }

      // Check if already accepted
      if (invitationData.status === 'accepted') {
        setError(t('invitation.errors.alreadyAccepted'));
        // Clear used token from localStorage
        localStorage.removeItem('pending_invitation_token');
      }

      // Check if revoked
      if (invitationData.status === 'revoked') {
        setError(t('invitation.errors.revoked'));
        // Clear revoked token from localStorage
        localStorage.removeItem('pending_invitation_token');
      }

      // Check if expired
      if (isInvitationExpired(invitationData.expires_at)) {
        setError(t('invitation.errors.expired'));
        // Clear expired token from localStorage
        localStorage.removeItem('pending_invitation_token');
      }
    } catch (err: any) {
      console.error('Failed to load invitation:', err);
      setError(normalizeInvitationError(err.message) || t('invitation.errors.loadFailed'));
      // Clear invalid token from localStorage
      localStorage.removeItem('pending_invitation_token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation || !user) return;

    try {
      setIsAccepting(true);

      // Accept the invitation
      await acceptInvitation({ token: invitationToken });

      // Clear pending invitation from localStorage
      localStorage.removeItem('pending_invitation_token');

      // Refresh user's workspaces
      await refreshWorkspaces();

      toast.success(t('invitation.successMessage'));

      // Redirect to workspace dashboard
      const workspaceId = invitation.workspace?.id || invitation.workspace_id;
      navigate(`/workspaces/${workspaceId}/dashboard`, { replace: true });
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      toast.error(normalizeInvitationError(err.message) || t('invitation.errors.acceptFailed'));
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    localStorage.removeItem('pending_invitation_token');
    navigate('/auth/login');
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D97757] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('invitation.loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('invitation.invalidTitle')}</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              // Clear the invalid token from localStorage
              localStorage.removeItem('pending_invitation_token');
              navigate('/auth/login');
            }}
            className="w-full bg-[#D97757] hover:bg-[#c8684a] text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {t('invitation.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  // No invitation loaded
  if (!invitation) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('invitation.notFoundTitle')}</h1>
          <p className="text-gray-600 mb-6">
            {t('invitation.notFoundDesc')}
          </p>
          <button
            onClick={() => {
              // Clear the invalid token from localStorage
              localStorage.removeItem('pending_invitation_token');
              navigate('/auth/login');
            }}
            className="w-full bg-[#D97757] hover:bg-[#c8684a] text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {t('invitation.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  // Success - show invitation details
  return (
    <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#D97757]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-[#D97757]" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('invitation.title')}</h1>
          <p className="text-gray-600">{t('invitation.subtitle')}</p>
        </div>

        {/* Invitation Details */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
          {/* Workspace */}
          <div className="flex items-start space-x-3">
            <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">{t('invitation.workspace')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {invitation.workspace?.name || invitation.workspace_display_name || invitation.workspace_name}
              </p>
              {invitation.workspace?.description && (
                <p className="text-sm text-gray-600 mt-1">{invitation.workspace.description}</p>
              )}
            </div>
          </div>

          {/* Role */}
          <div className="flex items-start space-x-3">
            <Users className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">{t('invitation.role')}</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {intl.formatMessage(
                  { id: `roles.${invitation.role}`, defaultMessage: invitation.role },
                )}
              </p>
            </div>
          </div>

          {/* Invited By */}
          <div className="flex items-start space-x-3">
            <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">{t('invitation.invitedBy')}</p>
              <p className="text-lg font-semibold text-gray-900">{invitation.invited_by_name}</p>
            </div>
          </div>

          {/* Expiration */}
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">{t('invitation.expires')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatTimeRemaining(invitation.expires_at)}
              </p>
            </div>
          </div>

          {/* Custom Message */}
          {invitation.message && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-500 mb-2">{t('invitation.messageFrom', { name: invitation.invited_by_name })}</p>
              <p className="text-gray-700 italic">"{invitation.message}"</p>
            </div>
          )}

          {/* Skills (if any) */}
          {invitation.initial_skills && invitation.initial_skills.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-500 mb-2">{t('invitation.requiredSkills')}</p>
              <div className="flex flex-wrap gap-2">
                {invitation.initial_skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleDecline}
            disabled={isAccepting}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('invitation.decline')}
          </button>
          <button
            onClick={handleAcceptInvitation}
            disabled={isAccepting}
            className="flex-1 bg-[#D97757] hover:bg-[#c8684a] text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isAccepting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{t('invitation.accepting')}</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>{t('invitation.accept')}</span>
              </>
            )}
          </button>
        </div>

        {/* User Info Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {t('invitation.loggedInAs')} <span className="font-medium text-gray-700">{user?.email}</span>
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('pending_invitation_token');
              navigate('/auth/login');
            }}
            className="text-sm text-[#D97757] hover:text-[#c8684a] font-medium mt-1"
          >
            {t('invitation.notYou')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
