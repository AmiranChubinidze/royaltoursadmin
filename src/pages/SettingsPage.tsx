import RemindersSettings from "@/components/RemindersSettings";

export default function SettingsPage() {
  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-4">
      <div className="mb-1">
        <h1 className="page-title text-foreground">Settings</h1>
        <p className="text-muted-foreground">Reminders and preferences.</p>
      </div>
      <RemindersSettings />
    </div>
  );
}
