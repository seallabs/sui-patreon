"use client";

import { CreatePostFormData, AudienceAccess, SubscriptionTier } from "@/types";
import { Button } from "@/components/ui/button";
import { AudienceSelector } from "./audience-selector";

interface SettingsSidebarProps {
  formData: CreatePostFormData;
  onFormChange: (updates: Partial<CreatePostFormData>) => void;
  availableTiers: SubscriptionTier[];
  onPreview: () => void;
  onPublish: () => void;
  isPublishing?: boolean;
}

export function SettingsSidebar({
  formData,
  onFormChange,
  availableTiers,
  onPreview,
  onPublish,
  isPublishing = false,
}: SettingsSidebarProps) {

  return (
    <aside className="w-96 shrink-0 border-l border-border bg-card">
      <div className="sticky top-0 flex h-screen flex-col">
        {/* Top Actions */}
        <div className="border-b border-border p-4">
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={onPublish}
              disabled={isPublishing || !formData.title.trim()}
              type="button"
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
          <div className="mt-4 text-center">
            <span className="text-sm font-medium text-muted-foreground">Settings</span>
          </div>
        </div>

        {/* Scrollable Settings */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {/* Audience Section */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Audience</h3>
              <AudienceSelector
                access={formData.audience}
                onAccessChange={(access: AudienceAccess) =>
                  onFormChange({ audience: access })
                }
                selectedTiers={formData.tierIds}
                onTiersChange={(tierIds: string[]) => onFormChange({ tierIds })}
                availableTiers={availableTiers}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
