"use client";

/**
 * Creator Profile Creation Modal
 *
 * Modal form for creating a new creator profile on-chain.
 * Integrates with:
 * - MinIO backend for avatar upload
 * - Sui blockchain for profile registration
 * - Form validation with React Hook Form + Zod
 *
 * Flow:
 * 1. User fills in form (name, bio, avatar)
 * 2. Upload avatar to MinIO backend
 * 3. Create Sui transaction with avatar URL
 * 4. Execute transaction and close modal on success
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { useTransaction } from "@/hooks/useTransaction";
import { uploadAvatar } from "@/lib/api/avatar-upload";
import { profileFormSchema, type ProfileFormData } from "@/lib/schemas/profile-schema";
import { PACKAGE_ID, PROFILE_REGISTRY } from "@/lib/sui/constants";

interface CreateProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateProfileModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateProfileModalProps) {
  const { execute, isLoading: isTransactionLoading } = useTransaction();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      bio: "",
      isAdultContent: false,
    },
  });

  const avatar = watch("avatar");
  const background = watch("background");
  const isLoading = isTransactionLoading || isUploadingAvatar;

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

  // Clear avatar selection
  const handleClearAvatar = () => {
    setValue("avatar", undefined as any, { shouldValidate: true });
    setAvatarPreview(null);
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

  // Clear background selection
  const handleClearBackground = () => {
    setValue("background", undefined as any, { shouldValidate: true });
    setBackgroundPreview(null);
  };

  // Form submission handler
  const onSubmit = async (data: ProfileFormData) => {
    try {
      // Step 1: Upload avatar to MinIO
      setIsUploadingAvatar(true);
      let avatarUrl: string;
      let backgroundUrl = "";

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

      // Step 2: Upload background image if provided
      if (data.background) {
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
      }

      setIsUploadingAvatar(false);

      // Step 3: Create profile on Sui blockchain
      await execute(
        (tx) => {
          tx.moveCall({
            target: `${PACKAGE_ID}::profile::create_profile`,
            arguments: [
              tx.object(PROFILE_REGISTRY),
              tx.pure.string(data.name),
              tx.pure.string(data.bio || ""),
              tx.pure.string(avatarUrl),
              tx.pure.string(backgroundUrl),
              tx.object(SUI_CLOCK_OBJECT_ID),
            ],
          });
        },
        {
          successMessage: "Creator profile created successfully!",
          errorMessage: "Failed to create profile",
          onSuccess: () => {
            // Reset form and close modal
            reset();
            setAvatarPreview(null);
            setBackgroundPreview(null);
            onOpenChange(false);

            // Call success callback
            if (onSuccess) {
              onSuccess();
            }
          },
        }
      );
    } catch (error) {
      console.error("Profile creation error:", error);
      // Error toast is handled by useTransaction hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create your creator page</DialogTitle>
          <DialogDescription>
            Set up your profile to start sharing content with your audience
          </DialogDescription>
        </DialogHeader>

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

          {/* Avatar Upload */}
          <div className="space-y-2">
            <Label htmlFor="avatar">
              Avatar <span className="text-red-500">*</span>
            </Label>

            {avatarPreview ? (
              <div className="relative">
                <div className="relative aspect-square w-32 overflow-hidden rounded-lg border border-border">
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                </div>
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

            <p className="text-xs text-muted-foreground">
              JPEG or PNG, max 10MB
            </p>

            {errors.avatar && (
              <p className="text-sm text-red-500">{errors.avatar.message}</p>
            )}
          </div>

          {/* Background Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="background">Background Image</Label>

            {backgroundPreview ? (
              <div className="relative">
                <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg border border-border">
                  <img
                    src={backgroundPreview}
                    alt="Background preview"
                    className="h-full w-full object-cover"
                  />
                </div>
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
              <div className="relative">
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

            <p className="text-xs text-muted-foreground">
              JPEG or PNG, max 10MB. Recommended: 1200x400px
            </p>

            {errors.background && (
              <p className="text-sm text-red-500">{errors.background.message}</p>
            )}
          </div>

          {/* Adult Content Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="isAdultContent"
              checked={watch("isAdultContent")}
              onCheckedChange={(checked) =>
                setValue("isAdultContent", checked as boolean)
              }
              disabled={isLoading}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="isAdultContent"
                className="text-sm font-normal cursor-pointer"
              >
                My page isn't suitable for people under 18
              </Label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploadingAvatar ? "Uploading..." : "Creating..."}
                </>
              ) : (
                "Create Page"
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
              Creating profile on blockchain...
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
