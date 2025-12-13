"use client";

import React from "react";
import { decodePassphrase } from "@/lib/utils";
import { DebugMode } from "@/lib/Debug";
import { KeyboardShortcuts } from "@/lib/KeyboardShortcuts";
import { RecordingIndicator } from "@/lib/RecordingIndicator";
import { SettingsMenu } from "@/lib/SettingsMenu";
import { ConnectionDetails } from "@/lib/types";
import {
  formatChatMessageLinks,
  LocalUserChoices,
  RoomContext,
  VideoConference,
} from "@livekit/components-react";
import { CustomPreJoin } from "@/components/meeting/CustomPreJoin";
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
  RoomEvent,
  TrackPublishDefaults,
  VideoCaptureOptions,
} from "livekit-client";
import { useRouter } from "next/navigation";
import { useSetupE2EE } from "@/lib/useSetupE2EE";
import { useLowCPUOptimizer } from "@/lib/usePerfomanceOptimiser";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

const CONN_DETAILS_ENDPOINT =
  process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details";
const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU == "true";

export function PageClientImpl(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
}) {
  const t = useTranslations("MeetingPage");
  const { data: session, status } = useSession();
  const isSessionLoading = status === "loading";
  const [preJoinChoices, setPreJoinChoices] = React.useState<
    LocalUserChoices | undefined
  >(undefined);
  const preJoinDefaults = React.useMemo(() => {
    return {
      username: session?.user?.name || "",
      videoEnabled: true,
      audioEnabled: true,
    };
  }, [session?.user?.name]);
  const [connectionDetails, setConnectionDetails] = React.useState<
    ConnectionDetails | undefined
  >(undefined);

  const handlePreJoinSubmit = React.useCallback(
    async (values: LocalUserChoices) => {
      setPreJoinChoices(values);
      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
      url.searchParams.append("roomName", props.roomName);
      url.searchParams.append("participantName", values.username);
      if (props.region) {
        url.searchParams.append("region", props.region);
      }
      const connectionDetailsResp = await fetch(url.toString());
      if (!connectionDetailsResp.ok) {
        // Handle specific error cases
        const errorText = await connectionDetailsResp.text();
        if (
          connectionDetailsResp.status === 401 ||
          connectionDetailsResp.status === 403
        ) {
          toast.error(t("errors.unauthorized"));
        } else {
          toast.error(
            t("errors.joinFailed", {
              error: errorText || connectionDetailsResp.statusText,
            })
          );
        }
        setPreJoinChoices(undefined); // Reset so user stays on pre-join or sees error
        return;
      }
      const connectionDetailsData = await connectionDetailsResp.json();
      setConnectionDetails(connectionDetailsData);
    },
    [props.roomName, props.region]
  );
  const handlePreJoinError = React.useCallback(
    (e: any) => console.error(e),
    []
  );

  return (
    <main data-lk-theme="default" className="h-screen w-full bg-background">
      {isSessionLoading ? (
        <div className="grid place-items-center h-full w-full bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-main border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground">{t("preJoin.loading")}</p>
          </div>
        </div>
      ) : connectionDetails === undefined || preJoinChoices === undefined ? (
        <div className="grid place-items-center h-full w-full bg-background">
          <div className="w-full max-w-2xl p-6 rounded-base bg-secondary-background border-2 border-border shadow-shadow">
            <CustomPreJoin
              defaults={preJoinDefaults}
              onSubmit={handlePreJoinSubmit}
              onError={handlePreJoinError}
            />
          </div>
        </div>
      ) : (
        <VideoConferenceComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          options={{ codec: props.codec, hq: props.hq }}
        />
      )}
    </main>
  );
}

function VideoConferenceComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
  };
}) {
  const t = useTranslations("MeetingPage");
  const keyProvider = new ExternalE2EEKeyProvider();
  const { worker, e2eePassphrase } = useSetupE2EE();
  const e2eeEnabled = !!(e2eePassphrase && worker);

  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);

  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = props.options.codec
      ? props.options.codec
      : "vp9";
    if (e2eeEnabled && (videoCodec === "av1" || videoCodec === "vp9")) {
      videoCodec = undefined;
    }
    const videoCaptureDefaults: VideoCaptureOptions = {
      deviceId: props.userChoices.videoDeviceId ?? undefined,
      resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
    };
    const publishDefaults: TrackPublishDefaults = {
      dtx: false,
      videoSimulcastLayers: props.options.hq
        ? [VideoPresets.h1080, VideoPresets.h720]
        : [VideoPresets.h540, VideoPresets.h216],
      red: !e2eeEnabled,
      videoCodec,
    };
    return {
      videoCaptureDefaults: videoCaptureDefaults,
      publishDefaults: publishDefaults,
      audioCaptureDefaults: {
        deviceId: props.userChoices.audioDeviceId ?? undefined,
      },
      adaptiveStream: true,
      dynacast: true,
      e2ee:
        keyProvider && worker && e2eeEnabled
          ? { keyProvider, worker }
          : undefined,
      singlePeerConnection: true,
    };
  }, [props.userChoices, props.options.hq, props.options.codec]);

  const room = React.useMemo(() => new Room(roomOptions), []);

  React.useEffect(() => {
    if (e2eeEnabled) {
      keyProvider
        .setKey(decodePassphrase(e2eePassphrase))
        .then(() => {
          room.setE2EEEnabled(true).catch((e) => {
            if (e instanceof DeviceUnsupportedError) {
              toast.error(t("errors.encryptionNotSupported"));
              console.error(e);
            } else {
              throw e;
            }
          });
        })
        .then(() => setE2eeSetupComplete(true));
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, room, e2eePassphrase]);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  React.useEffect(() => {
    room.on(RoomEvent.Disconnected, handleOnLeave);
    room.on(RoomEvent.EncryptionError, handleEncryptionError);
    room.on(RoomEvent.MediaDevicesError, handleError);

    if (e2eeSetupComplete) {
      room
        .connect(
          props.connectionDetails.serverUrl,
          props.connectionDetails.participantToken,
          connectOptions
        )
        .catch((error) => {
          handleError(error);
        });
      if (props.userChoices.videoEnabled) {
        room.localParticipant.setCameraEnabled(true).catch((error) => {
          handleError(error);
        });
      }
      if (props.userChoices.audioEnabled) {
        room.localParticipant.setMicrophoneEnabled(true).catch((error) => {
          handleError(error);
        });
      }
    }
    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.off(RoomEvent.EncryptionError, handleEncryptionError);
      room.off(RoomEvent.MediaDevicesError, handleError);
    };
  }, [e2eeSetupComplete, room, props.connectionDetails, props.userChoices]);

  const lowPowerMode = useLowCPUOptimizer(room);

  const router = useRouter();
  const handleOnLeave = React.useCallback(() => window.close(), []);
  const handleError = React.useCallback(
    (error: Error) => {
      console.error(error);
      toast.error(t("errors.unexpectedError", { error: error.message }));
    },
    [t]
  );
  const handleEncryptionError = React.useCallback(
    (error: Error) => {
      console.error(error);
      toast.error(t("errors.encryptionError", { error: error.message }));
    },
    [t]
  );

  React.useEffect(() => {
    if (lowPowerMode) {
      console.warn(t("warnings.lowPowerMode"));
    }
  }, [lowPowerMode, t]);

  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <RoomContext.Provider value={room}>
        <KeyboardShortcuts />
        <VideoConference
          chatMessageFormatter={formatChatMessageLinks}
          SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
        />
        <DebugMode />
        <RecordingIndicator />
      </RoomContext.Provider>
    </div>
  );
}
