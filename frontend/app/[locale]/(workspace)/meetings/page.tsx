"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { encodePassphrase, generateRoomId, randomString } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Video, Shield, Lock, Users } from "lucide-react";
import { useLocale } from "next-intl";

function Meeting() {
  const router = useRouter();
  const locale = useLocale();
  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));
  const [roomId, setRoomId] = useState("");

  const startMeeting = () => {
    const targetRoomId = roomId.trim() || generateRoomId();
    if (e2ee) {
      window.open(
        `/${locale}/rooms/${targetRoomId}#${encodePassphrase(
          sharedPassphrase
        )}`,
        "_blank"
      );
    } else {
      window.open(`/${locale}/rooms/${targetRoomId}`, "_blank");
    }
  };

  const joinMeeting = () => {
    if (!roomId.trim()) return;
    if (e2ee) {
      window.open(
        `/${locale}/rooms/${roomId.trim()}#${encodePassphrase(
          sharedPassphrase
        )}`,
        "_blank"
      );
    } else {
      window.open(`/${locale}/rooms/${roomId.trim()}`, "_blank");
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-main rounded-base border-2 border-border shadow-shadow">
          <Video className="h-6 w-6 text-main-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-heading text-foreground">Meetings</h1>
          <p className="text-sm text-foreground/70">
            Create or join video meetings with your team
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Meeting Card */}
        <Card className="animate-slideUp animation-delay-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-main" />
              Start a New Meeting
            </CardTitle>
            <CardDescription>
              Create a new meeting room and invite participants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-id">Room ID (Optional)</Label>
              <Input
                id="room-id"
                placeholder="Leave empty to generate automatically"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>

            <Button onClick={startMeeting} className="w-full" size="lg">
              <Video className="h-4 w-4" />
              Start Meeting
            </Button>
          </CardContent>
        </Card>

        {/* Join Meeting Card */}
        <Card className="animate-slideUp animation-delay-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-main" />
              Join a Meeting
            </CardTitle>
            <CardDescription>
              Enter a room ID to join an existing meeting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="join-room-id">Room ID</Label>
              <Input
                id="join-room-id"
                placeholder="Enter room ID to join"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>

            <Button
              onClick={joinMeeting}
              variant="default"
              className="w-full"
              size="lg"
              disabled={!roomId.trim()}
            >
              <Users className="h-4 w-4" />
              Join Meeting
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Security Options Card */}
      <Card className="animate-slideUp animation-delay-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-main" />
            Security Options
          </CardTitle>
          <CardDescription>
            Configure end-to-end encryption for your meetings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="use-e2ee"
              checked={e2ee}
              onCheckedChange={(checked: boolean | "indeterminate") =>
                setE2ee(checked === true)
              }
            />
            <div className="space-y-1">
              <Label htmlFor="use-e2ee" className="cursor-pointer">
                Enable end-to-end encryption
              </Label>
              <p className="text-xs text-foreground/60">
                All meeting data will be encrypted before transmission
              </p>
            </div>
          </div>

          {e2ee && (
            <div className="space-y-2 pt-2 border-t-2 border-border">
              <Label htmlFor="passphrase">Encryption Passphrase</Label>
              <Input
                id="passphrase"
                type="password"
                value={sharedPassphrase}
                onChange={(ev) => setSharedPassphrase(ev.target.value)}
                placeholder="Enter a secure passphrase"
              />
              <p className="text-xs text-foreground/60">
                Share this passphrase securely with other participants
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return <Meeting />;
}
