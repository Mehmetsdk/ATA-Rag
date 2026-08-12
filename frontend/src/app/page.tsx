import { ChatPage } from "@/components/chat/chat-page";
import { AppShell } from "@/components/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell activeNav="chat">
      <ChatPage />
    </AppShell>
  );
}
