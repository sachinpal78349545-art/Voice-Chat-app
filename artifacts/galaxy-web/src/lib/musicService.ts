const MUSIC_LIBRARY = [
  { id: "lofi_chill", name: "Lo-Fi Chill", category: "Chill", icon: "🎵", url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { id: "jazz_cafe", name: "Jazz Café", category: "Jazz", icon: "🎷", url: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946bc3e654.mp3" },
  { id: "ambient_space", name: "Ambient Space", category: "Ambient", icon: "🌌", url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3" },
  { id: "soft_piano", name: "Soft Piano", category: "Piano", icon: "🎹", url: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3" },
  { id: "acoustic_guitar", name: "Acoustic Guitar", category: "Acoustic", icon: "🎸", url: "https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3" },
  { id: "edm_beat", name: "EDM Energy", category: "EDM", icon: "🔊", url: "https://cdn.pixabay.com/download/audio/2023/07/19/audio_e50689ba56.mp3" },
  { id: "rnb_smooth", name: "R&B Smooth", category: "R&B", icon: "🎤", url: "https://cdn.pixabay.com/download/audio/2022/11/22/audio_c5c6f1e245.mp3" },
  { id: "arabic_vibes", name: "Arabic Vibes", category: "Arabic", icon: "🪘", url: "https://cdn.pixabay.com/download/audio/2023/04/07/audio_44ca2c5a75.mp3" },
  { id: "indian_classical", name: "Indian Classical", category: "Indian", icon: "🪷", url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_bff7cc4542.mp3" },
  { id: "nature_sounds", name: "Nature Sounds", category: "Nature", icon: "🌿", url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3" },
];

const MUSIC_CATEGORIES = ["All", "Chill", "Jazz", "Ambient", "Piano", "Acoustic", "EDM", "R&B", "Arabic", "Indian", "Nature"];

class MusicService {
  private audio: HTMLAudioElement | null = null;
  private _playing = false;
  private _currentTrack: typeof MUSIC_LIBRARY[0] | null = null;
  private _volume = 0.3;
  private listeners: Array<() => void> = [];

  getLibrary() { return MUSIC_LIBRARY; }
  getCategories() { return MUSIC_CATEGORIES; }

  getByCategory(cat: string) {
    if (cat === "All") return MUSIC_LIBRARY;
    return MUSIC_LIBRARY.filter(m => m.category === cat);
  }

  isPlaying() { return this._playing; }
  getCurrentTrack() { return this._currentTrack; }
  getVolume() { return this._volume; }

  play(trackId: string) {
    const track = MUSIC_LIBRARY.find(m => m.id === trackId);
    if (!track) return;

    this.stop();
    this.audio = new Audio(track.url);
    this.audio.volume = this._volume;
    this.audio.loop = true;
    this.audio.crossOrigin = "anonymous";

    this.audio.play().then(() => {
      this._playing = true;
      this._currentTrack = track;
      this.notify();
    }).catch(err => {
      console.warn("[Music] Play failed:", err);
      this._playing = false;
      this.notify();
    });

    this.audio.onended = () => {
      this._playing = false;
      this.notify();
    };
  }

  pause() {
    if (this.audio && this._playing) {
      this.audio.pause();
      this._playing = false;
      this.notify();
    }
  }

  resume() {
    if (this.audio && !this._playing) {
      this.audio.play().then(() => {
        this._playing = true;
        this.notify();
      }).catch(() => {});
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    this._playing = false;
    this._currentTrack = null;
    this.notify();
  }

  setVolume(vol: number) {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.audio) this.audio.volume = this._volume;
    this.notify();
  }

  onChange(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      const i = this.listeners.indexOf(cb);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  cleanup() {
    this.stop();
    this.listeners = [];
  }
}

export const musicService = new MusicService();
