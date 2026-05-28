import { Button } from "@data-browser/components/ui/Button";
import { cn } from "@data-browser/lib/utils";
import type { ActivityTab } from "@data-browser/stores/useLayoutStore";
import { Database, LayoutDashboard } from "lucide-react";
import type React from "react";

interface ActivityBarProps {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
}

export function ActivityBar({ activeTab, onTabChange }: ActivityBarProps) {
  const tabs: { id: ActivityTab; icon: React.ElementType; label: string }[] = [
    {
      id: "connections",
      icon: Database,
      label: "Connections",
    },
    {
      id: "analysis",
      icon: LayoutDashboard,
      label: "Analysis",
    },
  ];

  const renderTab = (tab: {
    id: ActivityTab;
    icon: React.ElementType;
    label: string;
  }) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;

    return (
      <Button
        className={cn(
          "flex size-16 flex-col items-center justify-center gap-1 rounded-lg px-2 py-3",
          isActive
            ? "bg-input text-foreground"
            : "text-foreground hover:bg-input/50"
        )}
        data-qa-action="switch"
        data-qa-module="layout"
        data-qa-object="activity-tab"
        data-qa-resource-id={tab.id}
        data-qa-resource-type="activity-tab"
        data-qa-state={isActive ? "active" : "inactive"}
        data-testid="layout.activity.tab"
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        variant="ghost"
      >
        <Icon className="size-6" />
        <span className="text-xs leading-4">{tab.label}</span>
      </Button>
    );
  };

  return (
    <div
      className="flex h-full w-20 flex-col items-center border-r bg-background px-2 py-1.5"
      data-qa-module="layout"
      data-qa-object="activity-bar"
      data-qa-state={activeTab}
      data-testid="layout.activity-bar"
    >
      <div className="flex flex-col gap-2">{tabs.map(renderTab)}</div>
    </div>
  );
}
