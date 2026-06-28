/**
 * LiveKit Video Call Component
 * Uses LiveKit for professional video conferencing through nexus backend
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { videoCallApi } from '@/lib/api/video-call-api';
import {
  Loader2,
  Link,
  Check,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useParams } from 'react-router-dom';
import { JoinRequestModal } from './JoinRequestModal';
import { JoinRequestList } from './JoinRequestNotification';
import type { JoinRequest } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { InvitePeopleModal } from './InvitePeopleModal';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/lib/config';

interface LiveKitVideoCallProps {
  callId: string;
  onDisconnect?: () => void;
  className?: string;
}

export const LiveKitVideoCall: React.FC<LiveKitVideoCallProps> = ({
  callId,
  onDisconnect,
  className,
}) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Join request states
  const [showJoinRequestModal, setShowJoinRequestModal] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [socketConnection, setSocketConnection] = useState<Socket | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Use ref to track authorization status to prevent modal flashing
  const isAuthorizedRef = useRef<boolean | null>(null);

  // Get media settings from sessionStorage (set by IncomingCallModal)
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  // Get workspace ID and auth context
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();

  useEffect(() => {
    // Check for saved media settings
    const savedSettings = sessionStorage.getItem('callMediaSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        console.log('📹 [LiveKitVideoCall] Retrieved media settings:', settings);
        setMicEnabled(settings.micEnabled ?? true);
        setCameraEnabled(settings.cameraEnabled ?? true);
        // Clear the settings after reading
        sessionStorage.removeItem('callMediaSettings');
      } catch (err) {
        console.error('Failed to parse media settings:', err);
      }
    }
  }, []);

  useEffect(() => {
    const joinCall = async () => {
      console.log('🎬 [Join Flow Started] Initial state:', {
        showJoinRequestModal,
        hasCheckedAuth,
        userId: user?.id,
      });

      // CRITICAL: Wait for user to be loaded before proceeding
      if (!user?.id) {
        console.log('⏳ [Join Flow] Waiting for user to be loaded...');
        return;
      }

      // Declare variables outside try block so they're accessible in catch
      let inviteesList: string[] = [];

      try {
        setIsLoading(true);
        setError(null);

        // First, get call details to check if user is host or invited
        const callDetails = await videoCallApi.getCall(callId);
        const userIsHost = callDetails.host_user_id === user?.id;
        setIsHost(userIsHost);

        // Check if user is in the invitees list (includes host + invited participants)
        // Handle both array and potential JSON string formats
        if (Array.isArray(callDetails.invitees)) {
          inviteesList = callDetails.invitees;
        } else if (typeof callDetails.invitees === 'string') {
          try {
            inviteesList = JSON.parse(callDetails.invitees);
          } catch (e) {
            console.error('Failed to parse invitees:', e);
          }
        }

        const isInvited = inviteesList.includes(user?.id || '');

        // Debug logging
        console.log('📋 [Join Check]', {
          userId: user?.id,
          hostId: callDetails.host_user_id,
          userIsHost,
          inviteesRaw: callDetails.invitees,
          inviteesList,
          isInvited,
        });

        // Allow automatic join if:
        // 1. User is the host, OR
        // 2. User is in the invitees list (was directly invited)
        // Otherwise, show join request modal
        if (!userIsHost && !isInvited) {
          console.log('🚫 User not invited or host - showing join request modal');
          isAuthorizedRef.current = false;
          setHasCheckedAuth(true);
          setShowJoinRequestModal(true);
          setIsLoading(false);
          return;
        }

        console.log('✅ User is authorized (host or invited) - joining automatically');
        console.log('🔒 Modal will NOT be shown - user is authorized');

        // CRITICAL: For authorized users, mark in ref and NEVER show the modal
        isAuthorizedRef.current = true;
        setShowJoinRequestModal(false);
        setHasCheckedAuth(true);

        // Call Nexus backend to join the call
        // Backend uses nexus SDK to generate LiveKit token
        const response = await videoCallApi.joinCall(callId, {});

        console.log('Join call response:', response);

        if (!response.token || !response.room_url) {
          throw new Error('Invalid response from server: missing token or room_url');
        }

        setToken(response.token);
        setServerUrl(response.room_url);
        setRoomName(response.room_name || callId);

        // Set call type from response
        const responseCallType = response.call?.call_type || 'video';
        setCallType(responseCallType);
        console.log('📹 [LiveKitVideoCall] Call type:', responseCallType);

        // For audio calls, force camera to be disabled
        if (responseCallType === 'audio') {
          console.log('🎤 [LiveKitVideoCall] Audio call detected - disabling camera');
          setCameraEnabled(false);
        }

        console.log('[Call] Connected to video call');
      } catch (err: any) {
        console.error('❌ Failed to join call:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response,
          status: err.response?.status,
        });

        // Only show join request modal if explicitly unauthorized (403)
        // AND we haven't already determined the user is authorized
        const is403Error = err.response?.status === 403;
        const hasAuthError = err.message?.includes('not invited') ||
          err.message?.includes('not authorized') ||
          err.message?.includes('forbidden');

        if (is403Error || hasAuthError) {
          // Double-check: if user IS the host or invited, this is a different error
          if (isHost || inviteesList.includes(user?.id || '')) {
            console.error('⚠️ User is authorized but got auth error - this is a bug');
            setHasCheckedAuth(true);
            setShowJoinRequestModal(false); // Ensure modal doesn't show
            setError('Failed to connect to video call. Please try again.');
            console.error('[Call] Connection failed - please refresh and try again');
          } else {
            console.log('🚫 Auth error and user not authorized - showing join request modal');
            setHasCheckedAuth(true);
            setShowJoinRequestModal(true);
          }
          setIsLoading(false);
          return;
        }

        setError(err.message || 'Failed to join video call');
        console.error('[Call] Failed to join video call');
      } finally {
        setIsLoading(false);
      }
    };

    joinCall();
  }, [callId, user?.id]);

  const handleDisconnected = async () => {
    try {
      // Notify backend that we left the call
      await videoCallApi.leaveCall(callId);
      console.log('[Call] Left video call');
    } catch (err) {
      console.error('Failed to leave call:', err);
    }

    if (onDisconnect) {
      onDisconnect();
    }
  };

  const handleCopyRoomLink = () => {
    // Construct the full room URL with workspace ID
    // Add ?popup=true to force opening in new window
    const roomUrl = `${window.location.origin}/call/${workspaceId}/${callId}`;

    navigator.clipboard.writeText(roomUrl).then(() => {
      setLinkCopied(true);
      console.log('[Call] Room link copied');

      // Reset the copied state after 3 seconds
      setTimeout(() => {
        setLinkCopied(false);
      }, 3000);
    }).catch((err) => {
      console.error('[Call] Failed to copy link:', err);
    });
  };

  // Handle join request submission
  const handleRequestJoin = async (displayName: string, message: string) => {
    try {
      // IMPORTANT: Connect to WebSocket BEFORE sending request
      // This ensures we don't miss the acceptance event if host accepts very quickly
      const socketController = setupRequesterWebSocket();

      const response = await videoCallApi.requestJoin(callId, { display_name: displayName, message });
      setShowJoinRequestModal(false);
      console.log('[Call] Join request sent');

      // Show a waiting state
      setIsLoading(true);

      // Set the request ID so the WebSocket listeners can match the response
      socketController.setRequestId(response.request_id);
    } catch (err: any) {
      console.error('[Call] Failed to send join request:', err);
    }
  };

  // Setup WebSocket connection for requester to wait for response
  const setupRequesterWebSocket = () => {
    console.log('🔌 [Requester WebSocket] Connecting to wait for response...');

    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('❌ [Requester WebSocket] No auth token found');
      throw new Error('No auth token found');
    }

    // Connect to WebSocket
    const socket = io(`${API_CONFIG.baseUrl}/video-calls`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      auth: { token },
      extraHeaders: { Authorization: `Bearer ${token}` },
    });

    socket.on('connect', () => {
      console.log('✅ [Requester WebSocket] Connected');
    });

    // Use a ref to store request ID that can be updated after socket creation
    let currentRequestId: string | null = null;

    // Listen for request accepted
    socket.on('join-request:accepted', (data: { call_id: string; request_id: string; message: string }) => {
      console.log('✅ [Requester] Join request accepted!', data);

      if (data.request_id === currentRequestId) {
        console.log('[Call] Request accepted, joining...');

        // Disconnect WebSocket
        socket.disconnect();

        // Reload the page to re-trigger the join flow
        // This time the user will be in the invitees list
        window.location.reload();
      }
    });

    // Listen for request rejected
    socket.on('join-request:rejected', (data: { call_id: string; request_id: string; message: string }) => {
      console.log('❌ [Requester] Join request rejected', data);

      if (data.request_id === currentRequestId) {
        console.log('[Call] Request rejected');

        // Disconnect WebSocket
        socket.disconnect();

        // Close the page or redirect
        setIsLoading(false);
        setError('Your request to join was rejected by the host.');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [Requester WebSocket] Connection error:', error.message);
    });

    // Return socket with method to set request ID
    return {
      setRequestId: (id: string) => {
        currentRequestId = id;
        console.log('📝 [Requester WebSocket] Request ID set:', id);
      },
      disconnect: () => socket.disconnect(),
    };
  };

  // Fetch pending join requests (for host reconnection safety)
  const fetchPendingJoinRequests = async () => {
    try {
      console.log('🔄 [Join Requests] Fetching pending requests for call:', callId);
      const pendingRequests = await videoCallApi.getJoinRequests(callId);

      if (pendingRequests && pendingRequests.length > 0) {
        console.log(`✅ [Join Requests] Found ${pendingRequests.length} pending request(s)`);

        // Add pending requests to state, avoiding duplicates
        setJoinRequests((prev) => {
          const existingIds = new Set(prev.map(req => req.id));
          const newRequests = pendingRequests
            .filter(req => !existingIds.has(req.id))
            .map(req => ({
              id: req.id,
              user_id: req.user_id,
              display_name: req.display_name,
              message: req.message,
              avatar: undefined, // API doesn't return avatar, will use fallback
              timestamp: req.requested_at,
            }));

          if (newRequests.length > 0) {
            console.log(`📥 [Join Requests] Adding ${newRequests.length} new request(s) to state`);
          }

          return [...prev, ...newRequests];
        });
      } else {
        console.log('✅ [Join Requests] No pending requests found');
      }
    } catch (err: any) {
      console.error('❌ [Join Requests] Failed to fetch pending requests:', err);
      // Don't show error to user as this is a background safety check
    }
  };

  // Debug: Track modal state changes
  useEffect(() => {
    console.log('📊 [Modal State]', {
      hasCheckedAuth,
      showJoinRequestModal,
      isHost,
      willRenderModal: hasCheckedAuth && showJoinRequestModal,
    });
  }, [hasCheckedAuth, showJoinRequestModal, isHost]);

  // WebSocket connection for real-time join requests
  useEffect(() => {
    if (!isHost || !callId) {
      return;
    }

    console.log('🔌 [WebSocket] Connecting to video-calls namespace...');

    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('❌ [WebSocket] No auth token found');
      return;
    }

    // Connect to the video-calls WebSocket namespace with auth
    const socket = io(`${API_CONFIG.baseUrl}/video-calls`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: {
        token,
      },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    socket.on('connect', () => {
      console.log('✅ [WebSocket] Connected to video-calls namespace');
      // Join the call room to receive notifications
      socket.emit('call:join', { callId });

      // IMPORTANT: Fetch any pending join requests that may have been sent while host was offline
      // This handles the corner case where host disconnects and someone sends a join request
      fetchPendingJoinRequests();
    });

    socket.on('disconnect', () => {
      console.log('❌ [WebSocket] Disconnected from video-calls namespace');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [WebSocket] Connection error:', error.message);
    });

    // Listen for join request events (match backend event names)
    socket.on('join-request:new', (data: { call_id: string; request: JoinRequest }) => {
      // Only handle requests for the current call
      if (data.call_id !== callId) {
        return;
      }
      console.log('🔔 [WebSocket] New join request received:', data);
      setJoinRequests((prev) => {
        // Avoid duplicates
        if (prev.some(req => req.id === data.request.id)) {
          return prev;
        }
        return [...prev, data.request];
      });
      console.log(`[Call] ${data.request.display_name} wants to join`);
    });

    // Listen for accepted join request
    socket.on('join-request:accepted', (data: { call_id: string; request_id: string; message: string }) => {
      // Only handle events for the current call
      if (data.call_id !== callId) {
        return;
      }
      console.log('✅ [WebSocket] Join request accepted:', data.request_id);
      setJoinRequests((prev) => prev.filter(req => req.id !== data.request_id));
    });

    // Listen for rejected join request
    socket.on('join-request:rejected', (data: { call_id: string; request_id: string; message: string }) => {
      // Only handle events for the current call
      if (data.call_id !== callId) {
        return;
      }
      console.log('❌ [WebSocket] Join request rejected:', data.request_id);
      setJoinRequests((prev) => prev.filter(req => req.id !== data.request_id));
    });

    setSocketConnection(socket);

    return () => {
      console.log('🔌 [WebSocket] Cleaning up connection');
      socket.disconnect();
      setSocketConnection(null);
    };
  }, [isHost, callId]);

  // Handle accept join request
  const handleAcceptJoinRequest = async (requestId: string) => {
    try {
      await videoCallApi.acceptJoinRequest(callId, requestId);
      setJoinRequests((prev) => prev.filter((req) => req.id !== requestId));
      console.log('[Call] Join request accepted');
    } catch (err: any) {
      console.error('[Call] Failed to accept join request:', err);
    }
  };

  // Handle reject join request
  const handleRejectJoinRequest = async (requestId: string) => {
    try {
      await videoCallApi.rejectJoinRequest(callId, requestId);
      setJoinRequests((prev) => prev.filter((req) => req.id !== requestId));
      console.log('[Call] Join request rejected');
    } catch (err: any) {
      console.error('[Call] Failed to reject join request:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">Connecting to video call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-red-500 mb-2">Connection Failed</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user needs to request access, show the modal with a background
  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">Checking access...</p>
        </div>

        {/* Join Request Modal - ONLY show if user is confirmed unauthorized */}
        {hasCheckedAuth && showJoinRequestModal && isAuthorizedRef.current === false ? (
          <JoinRequestModal
            isOpen={true}
            onClose={() => {
              setShowJoinRequestModal(false);
              if (onDisconnect) onDisconnect();
            }}
            onRequestJoin={handleRequestJoin}
            callType={callType}
            roomName={roomName}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('h-screen relative', className)}>
      <LiveKitRoom
        video={callType === 'video' ? cameraEnabled : false}
        audio={micEnabled ? {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        } : false}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={handleDisconnected}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        <div className="flex h-full relative">
          {/* Main video conference UI with controls */}
          <div className="w-full">
            <VideoConference />
          </div>

          {/* Control Buttons - Floating - White buttons for visibility */}
          <div className="absolute top-4 right-4 z-40 flex gap-2">
            {/* Invite Members Button - Only visible to host */}
            {isHost && (
              <Button
                size="lg"
                onClick={() => setShowInviteModal(true)}
                className="rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform cursor-pointer bg-white hover:bg-gray-100 text-green-600"
                title="Invite members to call"
              >
                <UserPlus className="h-5 w-5" />
              </Button>
            )}

            {/* Copy Room Link Button */}
            <Button
              size="lg"
              onClick={handleCopyRoomLink}
              className={cn(
                'rounded-full h-12 w-12 p-0 shadow-lg hover:scale-105 transition-transform cursor-pointer',
                linkCopied
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-700'
              )}
              title="Copy room link to invite others"
            >
              {linkCopied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Link className="h-5 w-5" />
              )}
            </Button>

          </div>
        </div>

        {/* Audio renderer for all participants */}
        <RoomAudioRenderer />
      </LiveKitRoom>

      {/* Join Request Notifications (for host) */}
      {isHost && joinRequests.length > 0 && (
        <JoinRequestList
          requests={joinRequests}
          onAccept={handleAcceptJoinRequest}
          onReject={handleRejectJoinRequest}
        />
      )}

      {/* Invite People Modal - Only for host */}
      {isHost && (
        <InvitePeopleModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
};

/**
 * Custom Video Grid Component (optional - for more control)
 */
export const CustomLiveKitVideoGrid: React.FC<LiveKitVideoCallProps> = ({
  callId,
  onDisconnect,
  className,
}) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');

  useEffect(() => {
    const joinCall = async () => {
      try {
        const response = await videoCallApi.joinCall(callId, {});
        setToken(response.token);
        setServerUrl(response.room_url);

        // Set call type from response
        const responseCallType = response.call?.call_type || 'video';
        setCallType(responseCallType);
      } catch (err) {
        console.error('Failed to join call:', err);
      } finally {
        setIsLoading(false);
      }
    };

    joinCall();
  }, [callId]);

  if (isLoading || !token || !serverUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={className || 'h-screen bg-gray-900'}>
      <LiveKitRoom
        video={callType === 'video'}
        audio={{
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        }}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={onDisconnect}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        {/* Custom layout with participant tiles */}
        <MyVideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

/**
 * Custom video conference layout
 */
function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="flex flex-col h-full">
      <GridLayout tracks={tracks} style={{ flex: 1 }}>
        <ParticipantTile />
      </GridLayout>
      <ControlBar />
    </div>
  );
}
