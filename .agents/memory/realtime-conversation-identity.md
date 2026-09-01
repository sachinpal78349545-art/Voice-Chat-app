---
name: Realtime conversation identity
description: Rules for keeping conversation list identity and presence tied to authenticated Firebase data.
---

Conversation list rows should use the authenticated user's conversation mapping for membership, then subscribe to each other participant's profile for current name, avatar, online state, and verification. Conversation snapshots remain the source for message preview, timestamp, and unread count.

**Why:** Conversation metadata can be stale while profile and presence data change independently; generated names, avatars, timestamps, or mutual counts make a production chat list look valid while showing incorrect data.

**How to apply:** Keep empty, loading, and error states explicit; use neutral missing-field handling only, and never create welcome/system conversations as a side effect of opening the Messages page.