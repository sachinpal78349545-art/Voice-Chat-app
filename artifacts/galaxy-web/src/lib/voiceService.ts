import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";

const APP_ID = "5a9957fd6a8047f48310fd0e5545d42c";

AgoraRTC.setLogLevel(4);

type SpeakerCb = (uid: number, volume: number) => void;
type RemoteUserCb = (uid: number, joined: boolean) => void;

class VoiceService {
  private client: IAgoraRTCClient | null = null;
  private localTrack: IMicrophoneAudioTrack | null = null;
  private _muted = true;
  private _speakerOff = false;
  private _ready = false;
  private _joined = false;
  private _micEnabled = false;
  private speakerCb: SpeakerCb | null = null;
  private remoteCb: RemoteUserCb | null = null;
  private volumeInterval: ReturnType<typeof setInterval> | null = null;
  private remoteVolumes: Map<number, number> = new Map();
  private _channel: string | null = null;
  private _uid: number | null = null;
  private _token: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async init(): Promise<boolean> {
    try {
      if (this.client) {
        this.client.removeAllListeners();
      }
      this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      this._ready = true;
      this.setupEventHandlers();
      return true;
    } catch (e) {
      console.warn("[Agora] SDK init error:", e);
      return false;
    }
  }

  private setupEventHandlers() {
    if (!this.client) return;
    this.client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType: string) => {
      if (mediaType === "audio") {
        try {
          await this.client!.subscribe(user, "audio");
          const remoteTrack = user.audioTrack;
          if (remoteTrack) {
            remoteTrack.play();
            const vol = this._speakerOff ? 0 : (this.remoteVolumes.get(Number(user.uid)) ?? 100);
            remoteTrack.setVolume(vol);
          }
          this.remoteCb?.(Number(user.uid), true);
        } catch (e) {
          console.warn("[Agora] subscribe error:", e);
        }
      }
    });
    this.client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType: string) => {
      if (mediaType === "audio") {
        this.remoteCb?.(Number(user.uid), false);
      }
    });
    this.client.on("user-joined", (user: IAgoraRTCRemoteUser) => {
      this.remoteCb?.(Number(user.uid), true);
    });
    this.client.on("user-left", (user: IAgoraRTCRemoteUser) => {
      this.remoteCb?.(Number(user.uid), false);
    });
    this.client.on("connection-state-change", (curState: string, prevState: string) => {
      console.log(`[Agora] Connection: ${prevState} -> ${curState}`);
      if (curState === "DISCONNECTED" && prevState === "CONNECTED" && this._channel) {
        this.handleReconnect();
      }
      if (curState === "CONNECTED") {
        this.reconnectAttempts = 0;
        this.clearReconnectTimer();
      }
    });
    this.client.on("exception", (evt: { code: number; msg: string }) => {
      console.warn(`[Agora] Exception: ${evt.code} - ${evt.msg}`);
    });
    this.client.on("network-quality", (stats: { uplinkNetworkQuality: number; downlinkNetworkQuality: number }) => {
      if (stats.downlinkNetworkQuality >= 4 || stats.uplinkNetworkQuality >= 4) {
        console.warn("[Agora] Poor network quality detected");
      }
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[Agora] Max reconnect attempts reached");
      return;
    }
    this.clearReconnectTimer();
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    console.log(`[Agora] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.reconnectTimer = setTimeout(async () => {
      if (!this._channel || !this._uid) return;
      try {
        await this.init();
        await this.join(this._channel, this._uid, this._token);
        if (this._micEnabled) {
          await this.enableMic();
        }
        console.log("[Agora] Reconnected successfully");
      } catch (e) {
        console.error("[Agora] Reconnect failed:", e);
        this.handleReconnect();
      }
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  async join(channel: string, uid: number, token: string | null = null): Promise<void> {
    if (!this._ready || !this.client) {
      console.log(`[Agora] Not ready, demo mode for channel "${channel}"`);
      return;
    }
    this._channel = channel;
    this._uid = uid;
    this._token = token;
    try {
      await this.client.join(APP_ID, channel, token, uid);
      this._joined = true;
      this._muted = true;
      this._micEnabled = false;
      this.startVolumeMonitor();
      console.log(`[Agora] Joined channel as listener: ${channel}`);
    } catch (e: any) {
      console.error("[Agora] join error:", e);
      if (e?.code === "OPERATION_ABORTED" || e?.code === "WS_ABORT") {
        console.log("[Agora] Retrying join...");
        await new Promise(r => setTimeout(r, 1500));
        try {
          await this.client.join(APP_ID, channel, token, uid);
          this._joined = true;
          this._muted = true;
          this._micEnabled = false;
          this.startVolumeMonitor();
          console.log(`[Agora] Joined on retry: ${channel}`);
        } catch (e2) {
          console.error("[Agora] join retry failed:", e2);
        }
      }
    }
  }

  async enableMic(): Promise<boolean> {
    if (!this._ready || !this.client || !this._joined) {
      console.warn("[Agora] Cannot enable mic - not joined");
      return false;
    }
    if (this._micEnabled && this.localTrack) {
      try {
        await this.localTrack.setMuted(false);
        this._muted = false;
        return true;
      } catch (e) {
        console.warn("[Agora] unmute error, recreating track:", e);
        await this.cleanupLocalTrack();
      }
    }
    try {
      this.localTrack = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true,
        ANS: true,
        AGC: true,
        encoderConfig: "speech_standard",
      });
      await this.client.publish([this.localTrack]);
      this._micEnabled = true;
      this._muted = false;
      console.log("[Agora] Mic enabled and published");
      return true;
    } catch (e) {
      console.error("[Agora] enableMic error:", e);
      await this.cleanupLocalTrack();
      return false;
    }
  }

  private async cleanupLocalTrack() {
    if (this.localTrack) {
      try {
        if (this.client && this._joined) {
          await this.client.unpublish([this.localTrack]);
        }
      } catch {}
      try { this.localTrack.stop(); } catch {}
      try { this.localTrack.close(); } catch {}
      this.localTrack = null;
    }
    this._micEnabled = false;
    this._muted = true;
  }

  async disableMic(): Promise<void> {
    await this.cleanupLocalTrack();
    console.log("[Agora] Mic disabled and unpublished");
  }

  async leave(): Promise<void> {
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;
    this.stopVolumeMonitor();
    await this.cleanupLocalTrack();
    if (this.client && this._joined) {
      try {
        await this.client.leave();
      } catch (e) {
        console.error("[Agora] leave error:", e);
      }
    }
    this._joined = false;
    this._muted = true;
    this._micEnabled = false;
    this._channel = null;
    this._uid = null;
    this._token = null;
  }

  async setMuted(muted: boolean): Promise<void> {
    this._muted = muted;
    if (this.localTrack) {
      try {
        await this.localTrack.setMuted(muted);
      } catch (e) {
        console.warn("[Agora] setMuted error:", e);
      }
    }
  }

  setSpeakerOff(off: boolean): void {
    this._speakerOff = off;
    if (this.client && this._joined) {
      for (const user of this.client.remoteUsers) {
        if (user.audioTrack) {
          try {
            user.audioTrack.setVolume(off ? 0 : (this.remoteVolumes.get(Number(user.uid)) ?? 100));
          } catch {}
        }
      }
    }
  }

  get speakerOff() { return this._speakerOff; }

  setRemoteVolume(uid: number, volume: number): void {
    this.remoteVolumes.set(uid, Math.max(0, Math.min(100, volume)));
    if (this._speakerOff) return;
    if (this.client && this._joined) {
      const users = this.client.remoteUsers;
      const user = users.find(u => Number(u.uid) === uid);
      if (user?.audioTrack) {
        try {
          user.audioTrack.setVolume(volume);
        } catch {}
      }
    }
  }

  getRemoteVolume(uid: number): number {
    return this.remoteVolumes.get(uid) ?? 100;
  }

  onSpeaker(cb: SpeakerCb) { this.speakerCb = cb; }
  onRemoteUser(cb: RemoteUserCb) { this.remoteCb = cb; }

  private startVolumeMonitor() {
    this.stopVolumeMonitor();
    this.volumeInterval = setInterval(() => {
      if (!this.client || !this._joined) return;
      try {
        if (this.localTrack && !this._muted && this._micEnabled) {
          const vol = this.localTrack.getVolumeLevel();
          this.speakerCb?.(0, vol * 100);
        }
        for (const user of this.client.remoteUsers) {
          if (user.audioTrack) {
            const vol = user.audioTrack.getVolumeLevel();
            this.speakerCb?.(Number(user.uid), vol * 100);
          }
        }
      } catch (e) {
        console.warn("[Agora] Volume monitor error:", e);
      }
    }, 200);
  }

  private stopVolumeMonitor() {
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
  }

  private _voiceEffect: VoiceEffect = "normal";
  private audioContext: AudioContext | null = null;
  private effectNodes: AudioNode[] = [];

  get muted() { return this._muted; }
  get ready() { return this._ready; }
  get joined() { return this._joined; }
  get micEnabled() { return this._micEnabled; }
  get voiceEffect() { return this._voiceEffect; }

  async setVoiceEffect(effect: VoiceEffect): Promise<void> {
    this._voiceEffect = effect;
    if (!this.localTrack || !this._micEnabled) return;

    try {
      this.cleanupEffectNodes();

      if (effect === "normal") return;

      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      const ctx = this.audioContext;

      const mediaStream = (this.localTrack as any)._mediaStreamTrack;
      if (!mediaStream) return;

      const source = ctx.createMediaStreamSource(new MediaStream([mediaStream]));
      const destination = ctx.createMediaStreamDestination();

      switch (effect) {
        case "deep": {
          const biquad = ctx.createBiquadFilter();
          biquad.type = "lowshelf";
          biquad.frequency.value = 200;
          biquad.gain.value = 15;
          const compressor = ctx.createDynamicsCompressor();
          source.connect(biquad).connect(compressor).connect(destination);
          this.effectNodes.push(biquad, compressor);
          break;
        }
        case "high": {
          const biquad = ctx.createBiquadFilter();
          biquad.type = "highshelf";
          biquad.frequency.value = 3000;
          biquad.gain.value = 15;
          source.connect(biquad).connect(destination);
          this.effectNodes.push(biquad);
          break;
        }
        case "robot": {
          const osc = ctx.createOscillator();
          osc.frequency.value = 50;
          osc.type = "sawtooth";
          const gainNode = ctx.createGain();
          gainNode.gain.value = 0.5;
          osc.connect(gainNode);
          const merger = ctx.createChannelMerger(2);
          source.connect(merger, 0, 0);
          gainNode.connect(merger, 0, 1);
          merger.connect(destination);
          osc.start();
          this.effectNodes.push(osc as any, gainNode, merger);
          break;
        }
        case "echo": {
          const delay = ctx.createDelay(1.0);
          delay.delayTime.value = 0.3;
          const feedback = ctx.createGain();
          feedback.gain.value = 0.4;
          const dry = ctx.createGain();
          dry.gain.value = 1.0;
          source.connect(dry).connect(destination);
          source.connect(delay);
          delay.connect(feedback);
          feedback.connect(delay);
          delay.connect(destination);
          this.effectNodes.push(delay, feedback, dry);
          break;
        }
      }

      console.log(`[Agora] Voice effect set to: ${effect}`);
    } catch (e) {
      console.warn("[Agora] Voice effect error:", e);
    }
  }

  private cleanupEffectNodes() {
    for (const node of this.effectNodes) {
      try { (node as any).disconnect?.(); } catch {}
      try { (node as any).stop?.(); } catch {}
    }
    this.effectNodes = [];
  }
}

export type VoiceEffect = "normal" | "deep" | "high" | "robot" | "echo";
export const VOICE_EFFECTS: { id: VoiceEffect; label: string; icon: string }[] = [
  { id: "normal", label: "Normal", icon: "🎤" },
  { id: "deep", label: "Deep", icon: "🔊" },
  { id: "high", label: "High", icon: "🎵" },
  { id: "robot", label: "Robot", icon: "🤖" },
  { id: "echo", label: "Echo", icon: "🔁" },
];

export const voiceService = new VoiceService();
