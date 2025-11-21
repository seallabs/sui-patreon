"use client";

/**
 * Account Settings Component
 *
 * Allows creators to update their profile information (name, bio, avatar).
 * Integrates with:
 * - MinIO backend for avatar upload
 * - Sui blockchain for profile updates
 * - Form validation with React Hook Form + Zod
 *
 * Flow:
 * 1. Load current profile data
 * 2. User edits form (name, bio, avatar)
 * 3. Upload new avatar to MinIO backend (if changed)
 * 4. Create Sui transaction with updated data
 * 5. Execute transaction and show success/error feedback
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X, ImageIcon, AlertCircle } from "lucide-react";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useTransaction } from "@/hooks/useTransaction";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import { uploadAvatar } from "@/lib/api/avatar-upload";
import {
  updateProfileFormSchema,
  type UpdateProfileFormData,
} from "@/lib/schemas/update-profile-schema";
import { PACKAGE_ID, PROFILE_REGISTRY } from "@/lib/sui/constants";
import { getAllTopics } from "@/lib/topics";

export function AccountSettings() {
  const { profile, hasProfile, isLoading: isProfileLoading, refetch } = useCreatorProfile();
  const { execute, isLoading: isTransactionLoading } = useTransaction();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileFormSchema),
    defaultValues: {
      name: "",
      bio: "",
    },
  });

  const avatar = watch("avatar");
  const background = watch("background");
  const isLoading = isTransactionLoading || isUploadingAvatar;

  // Load current profile data when available
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        bio: profile.bio,
        topic: profile.topic,
      });
      setAvatarPreview(profile.avatarUrl);
      setBackgroundPreview(profile.backgroundUrl || null);
    }
  }, [profile, reset]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(isDirty || !!avatar || !!background);
  }, [isDirty, avatar, background]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle avatar file selection
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Set file in form
    setValue("avatar", file, { shouldValidate: true });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Clear avatar selection (remove avatar preview)
  const handleClearAvatar = () => {
    setValue("avatar", undefined, { shouldValidate: true });
    setAvatarPreview(null);

    // Reset the file input
    const fileInput = document.getElementById("avatar") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  // Handle background file selection
  const handleBackgroundChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Set file in form
    setValue("background", file, { shouldValidate: true });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setBackgroundPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Clear background selection (remove background preview)
  const handleClearBackground = () => {
    setValue("background", undefined, { shouldValidate: true });
    setBackgroundPreview(null);

    // Reset the file input
    const fileInput = document.getElementById("background") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  // Form submission handler
  const onSubmit = async (data: UpdateProfileFormData) => {
    if (!profile) {
      return;
    }

    try {
      let avatarUrl = profile.avatarUrl;
      let backgroundUrl = profile.backgroundUrl || "";

      // Step 1: Upload new avatar if changed
      if (data.avatar) {
        setIsUploadingAvatar(true);

        try {
          avatarUrl = await uploadAvatar(data.avatar);
          console.log("Avatar uploaded successfully:", avatarUrl);
        } catch (error) {
          console.error("Avatar upload failed:", error);
          setIsUploadingAvatar(false);
          throw new Error(
            error instanceof Error ? error.message : "Failed to upload avatar"
          );
        }

        setIsUploadingAvatar(false);
      }

      // Step 2: Upload new background if changed
      if (data.background) {
        setIsUploadingAvatar(true);

        try {
          backgroundUrl = await uploadAvatar(data.background);
          console.log("Background uploaded successfully:", backgroundUrl);
        } catch (error) {
          console.error("Background upload failed:", error);
          setIsUploadingAvatar(false);
          throw new Error(
            error instanceof Error ? error.message : "Failed to upload background image"
          );
        }

        setIsUploadingAvatar(false);
      }

      // Step 3: Update profile on Sui blockchain
      await execute(
        (tx) => {
          tx.moveCall({
            target: `${PACKAGE_ID}::profile::update_profile`,
            arguments: [
              tx.object(PROFILE_REGISTRY),
              tx.pure.string(data.name),
              tx.pure.string(data.bio || ""),
              tx.pure.string(avatarUrl),
              tx.pure.string(backgroundUrl),
              tx.pure.u8(data.topic ?? profile.topic ?? 0),
              tx.object(SUI_CLOCK_OBJECT_ID),
            ],
          });
        },
        {
          successMessage: "Profile updated successfully!",
          errorMessage: "Failed to update profile",
          onSuccess: () => {
            // Wait 3 seconds before refetching to allow blockchain to index
            setTimeout(() => {
              // Refetch profile data from blockchain
              refetch();

              // Reset form dirty state
              reset({
                name: data.name,
                bio: data.bio,
                topic: data.topic,
              });
              setValue("avatar", undefined);
              setValue("background", undefined);
              setAvatarPreview(avatarUrl);
              setBackgroundPreview(backgroundUrl);
              setHasUnsavedChanges(false);
            }, 3000);
          },
        }
      );
    } catch (error) {
      console.error("Profile update error:", error);
      // Error toast is handled by useTransaction hook
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (profile) {
      reset({
        name: profile.name,
        bio: profile.bio,
        topic: profile.topic,
      });
      setValue("avatar", undefined);
      setValue("background", undefined);
      setAvatarPreview(profile.avatarUrl);
      setBackgroundPreview(profile.backgroundUrl || null);
      setHasUnsavedChanges(false);
    }
  };

  // Show loading state
  if (isProfileLoading) {
    return (
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">Account</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  // Show message if no profile exists
  if (!hasProfile) {
    return (
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">Account</h2>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to create a creator profile first. Please create your profile to
            manage your account settings.
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-xl font-semibold">Account</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Manage your account settings and preferences.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Page Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Page name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Your creator name"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            {...register("bio")}
            placeholder="Tell your audience about yourself..."
            rows={3}
            disabled={isLoading}
          />
          {errors.bio && (
            <p className="text-sm text-red-500">{errors.bio.message}</p>
          )}
        </div>

        {/* Topic Selector */}
        <div className="space-y-2">
          <Label htmlFor="topic">Topic</Label>
          <select
            id="topic"
            value={watch("topic") ?? profile?.topic ?? 0}
            onChange={(e) => setValue("topic", parseInt(e.target.value), { shouldValidate: true, shouldDirty: true })}
            disabled={isLoading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {getAllTopics().map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.displayName}
              </option>
            ))}
          </select>
          {errors.topic && (
            <p className="text-sm text-red-500">{errors.topic.message}</p>
          )}
        </div>

        {/* Avatar Upload */}
        <div className="space-y-2">
          <Label htmlFor="avatar">Avatar</Label>

          <div className="flex items-start gap-4">
            {avatarPreview ? (
              <div className="relative">
                <input
                  id="avatar"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleAvatarChange}
                  disabled={isLoading}
                  className="sr-only"
                />
                <label
                  htmlFor="avatar"
                  className="relative block aspect-square w-32 cursor-pointer overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-80"
                >
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                    <ImageIcon className="h-8 w-8 text-white" />
                  </div>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                  onClick={handleClearAvatar}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <input
                  id="avatar"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleAvatarChange}
                  disabled={isLoading}
                  className="sr-only"
                />
                <label
                  htmlFor="avatar"
                  className="flex aspect-square w-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:bg-muted"
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Upload Image
                  </span>
                </label>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            JPEG or PNG, max 10MB. {avatarPreview ? "Click image to change or X to remove." : "Upload an image."}
          </p>

          {errors.avatar && (
            <p className="text-sm text-red-500">{errors.avatar.message}</p>
          )}
        </div>

        {/* Background Image Upload */}
        <div className="space-y-2">
          <Label htmlFor="background">Background Image</Label>

          <div className="flex items-start gap-4">
            {backgroundPreview ? (
              <div className="relative w-full">
                <input
                  id="background"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleBackgroundChange}
                  disabled={isLoading}
                  className="sr-only"
                />
                <label
                  htmlFor="background"
                  className="relative block aspect-[3/1] w-full cursor-pointer overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-80"
                >
                  <img
                    src={backgroundPreview}
                    alt="Background preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                    <ImageIcon className="h-8 w-8 text-white" />
                  </div>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                  onClick={handleClearBackground}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative w-full">
                <input
                  id="background"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleBackgroundChange}
                  disabled={isLoading}
                  className="sr-only"
                />
                <label
                  htmlFor="background"
                  className="flex aspect-[3/1] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:bg-muted"
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Upload Background
                  </span>
                </label>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            JPEG or PNG, max 10MB. Recommended: 1200x400px. {backgroundPreview ? "Click image to change or X to remove." : "Upload an image."}
          </p>

          {errors.background && (
            <p className="text-sm text-red-500">{errors.background.message}</p>
          )}
        </div>

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Click Save to apply them.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading || !hasUnsavedChanges}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !hasUnsavedChanges}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploadingAvatar ? "Uploading..." : "Saving..."}
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>

        {/* Loading State Information */}
        {isUploadingAvatar && (
          <p className="text-center text-xs text-muted-foreground">
            Uploading avatar to storage...
          </p>
        )}
        {isTransactionLoading && (
          <p className="text-center text-xs text-muted-foreground">
            Updating profile on blockchain...
          </p>
        )}
      </form>
    </section>
  );
}
