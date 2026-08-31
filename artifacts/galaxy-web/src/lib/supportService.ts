import { ref, push, set } from "firebase/database";
import { db } from "./firebase";

export interface FeedbackRecord {
  id: string;
  userId: string;
  userName: string;
  type: "feedback" | "bug" | "suggestion";
  subject: string;
  message: string;
  timestamp: number;
  status: "pending" | "reviewed";
}

export async function submitFeedback(
  userId: string,
  userName: string,
  type: FeedbackRecord["type"],
  subject: string,
  message: string
): Promise<void> {
  const fRef = push(ref(db, "support/feedback"));
  await set(fRef, {
    id: fRef.key,
    userId,
    userName,
    type,
    subject,
    message,
    timestamp: Date.now(),
    status: "pending",
  });
}

export interface HelpArticle {
  id: string;
  icon: string;
  title: string;
  content: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "voice-rooms",
    icon: "\u{1F3A4}",
    title: "How Voice Rooms Work",
    content: "Join any live voice room to listen or participate. Tap a seat to sit down and use the mic button to speak. The host can mute, kick, or assign co-hosts. Raise your hand to request a seat.",
  },
  {
    id: "gifts-coins",
    icon: "\u{1F48E}",
    title: "Coins & Gifts",
    content: "Earn coins through daily tasks, daily rewards, and achievements. Use coins to send gifts in voice rooms. Each gift has a different cost. The recipient receives 80% of the gift value.",
  },
  {
    id: "levels-xp",
    icon: "\u2B50",
    title: "Levels & XP",
    content: "Gain XP by being active — joining rooms, sending messages, and completing daily tasks. Each level requires more XP. Higher levels unlock badges and VIP status.",
  },
  {
    id: "privacy-safety",
    icon: "\u{1F512}",
    title: "Privacy & Safety",
    content: "Control who can message you and see your profile in Privacy Settings. Block users who bother you. Report inappropriate behavior — our team reviews all reports.",
  },
  {
    id: "friends",
    icon: "\u{1F91D}",
    title: "Friends & Social",
    content: "Send friend requests to connect with people. Friends can find and message each other easily. Use the Find Users feature to search for people by name.",
  },
  {
    id: "chat",
    icon: "\u{1F4AC}",
    title: "Chat Features",
    content: "Send text, emoji, images, and voice messages. Double-tap a message to react. Purple double-ticks mean your message was seen. Record voice messages with the mic button.",
  },
  {
    id: "account",
    icon: "\u{1F464}",
    title: "Account & Profile",
    content: "Edit your profile photo, username, and bio from the Edit Profile page. Upload a photo or choose from emoji avatars. Your UID is your unique identifier.",
  },
  {
    id: "daily-tasks",
    icon: "\u2705",
    title: "Daily Tasks & Rewards",
    content: "Complete daily tasks to earn bonus coins. Tasks include joining rooms, sending messages, sending gifts, and logging in. Tasks reset every day at midnight. Maintain a login streak for bigger daily rewards.",
  },
];
