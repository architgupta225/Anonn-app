import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationName: string;
  onOrganizationCreated: (organization: any) => void;
}

export default function CreateOrganizationModal({
  isOpen,
  onClose,
  organizationName,
  onOrganizationCreated,
}: CreateOrganizationModalProps) {
  const [name, setName] = useState(organizationName);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Update name when organizationName prop changes
  useEffect(() => {
    setName(organizationName);
  }, [organizationName]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: "Organization name required",
        description: "Please enter a name for the organization",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const organization = await apiRequest("POST", "/api/organizations", {
        name: name.trim(),
      });

      toast({
        title: "Organization created!",
        description: `${name} has been created successfully.`,
      });

      onOrganizationCreated(organization);
      onClose();
    } catch (error: any) {
      console.error("Error creating organization:", error);
      
      let errorMessage = "Failed to create organization. Please try again.";
      if (error.message?.includes("already exists")) {
        errorMessage = "An organization with this name already exists.";
      }
      
      toast({
        title: "Failed to create organization",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName(organizationName);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Create New Organization</span>
          </DialogTitle>
          <DialogDescription>
            Create a new organization that you can tag in your posts. This organization will be available for all users.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter organization name"
              disabled={isCreating}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreating) {
                  handleCreate();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="bg-reddit-orange hover:bg-reddit-orange/90"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Organization"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
