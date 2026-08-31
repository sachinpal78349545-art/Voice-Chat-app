export interface LiveGift {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  url?: string;
  animationType?: "float" | "fullscreen" | "particle";
  soundUrl?: string;
  enabled?: boolean;
}

export interface GiftAnimState {
  emoji: string;
  giftName: string;
  sender: string;
  receiver: string;
  url?: string;
  isVip?: boolean;
  animationType?: "float" | "fullscreen" | "particle";
  combo?: number;
}
