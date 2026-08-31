import { Room, RoomSeat, RoomMessage } from "../../lib/roomService";
import { UserProfile } from "../../lib/userService";

export type { Room, RoomSeat, RoomMessage, UserProfile };

export function cleanName(name: string | undefined): string {
  if (!name) return "User";
  if (name.length > 20 && /^[a-zA-Z0-9]{15,}$/.test(name)) return name.slice(0, 6) + "..";
  return name.length > 14 ? name.slice(0, 12) + ".." : name;
}

export function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
