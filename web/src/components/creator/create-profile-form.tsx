"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FormData {
  displayName: string;
  suinsName: string;
  bio: string;
  category: string;
  avatarUrl: string;
  backgroundUrl: string;
}

/**
 * Creator profile creation form
 * TODO: Integrate with Move smart contract when ready (Task #1)
 */
export function CreateProfileForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    displayName: "",
    suinsName: "",
    bio: "",
    category: "",
    avatarUrl: "",
    backgroundUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Call smart contract
      // const tx = new TransactionBlock();
      // tx.moveCall({
      //   target: `${PACKAGE_ID}::profile::create_profile`,
      //   arguments: [
      //     tx.pure(formData.suinsName),
      //     tx.pure(formData.displayName),
      //     tx.pure(formData.bio),
      //     tx.pure(formData.avatarUrl),
      //   ],
      // });
      // await signAndExecuteTransactionBlock({ transactionBlock: tx });

      console.log("Creating profile:", formData);

      // Mock delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      alert("Profile creation pending smart contract integration (Task #1)");
    } catch (error) {
      console.error("Profile creation error:", error);
      alert("Error creating profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="displayName" className="mb-2 block text-sm font-medium">
          Display Name *
        </label>
        <Input
          id="displayName"
          name="displayName"
          value={formData.displayName}
          onChange={handleChange}
          placeholder="Your creative name"
          required
        />
      </div>

      <div>
        <label htmlFor="suinsName" className="mb-2 block text-sm font-medium">
          SuiNS Name
        </label>
        <Input
          id="suinsName"
          name="suinsName"
          value={formData.suinsName}
          onChange={handleChange}
          placeholder="yourname.sui"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Optional: Link your SuiNS name to your profile
        </p>
      </div>

      <div>
        <label htmlFor="bio" className="mb-2 block text-sm font-medium">
          Bio *
        </label>
        <textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          placeholder="Tell your audience about yourself..."
          rows={4}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          required
        />
      </div>

      <div>
        <label htmlFor="category" className="mb-2 block text-sm font-medium">
          Category *
        </label>
        <Input
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          placeholder="e.g., Visual Arts, Music, Technology"
          required
        />
      </div>

      <div>
        <label htmlFor="avatarUrl" className="mb-2 block text-sm font-medium">
          Avatar URL
        </label>
        <Input
          id="avatarUrl"
          name="avatarUrl"
          value={formData.avatarUrl}
          onChange={handleChange}
          placeholder="https://..."
          type="url"
        />
      </div>

      <div>
        <label htmlFor="backgroundUrl" className="mb-2 block text-sm font-medium">
          Background Image URL
        </label>
        <Input
          id="backgroundUrl"
          name="backgroundUrl"
          value={formData.backgroundUrl}
          onChange={handleChange}
          placeholder="https://..."
          type="url"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating Profile..." : "Create Profile"}
      </Button>
    </form>
  );
}
