import { I18nProvider } from "@/i18n/i18n-provider";
import { AgentWorkspace } from "@/layouts/agent-workspace/agent-workspace";

export default function Home() {
  return (
    <I18nProvider>
      <AgentWorkspace />
    </I18nProvider>
  );
}
