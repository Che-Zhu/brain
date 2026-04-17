"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@shadcn/ui/alert-dialog";
import { Button } from "@shadcn/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shadcn/ui/dialog";
import { Preview, PreviewWrapper } from "@shadcn/ui/preview";
import { Trash2 } from "lucide-react";

export default function AlertDialogExampleV1() {
  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <AlertDialogDestructive />
      <AlertDialogInDialog />
    </PreviewWrapper>
  );
}

function AlertDialogDestructive() {
  return (
    <Preview title="Destructive">
      <div className="flex justify-center">
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="destructive">Delete chat</Button>}
          />
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                <Trash2 className="size-8" />
              </AlertDialogMedia>
              <AlertDialogTitle>Delete chat?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this chat conversation. View{" "}
                <a href="https://example.com">Settings</a> delete any memories
                saved during this chat.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="ghost">Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Preview>
  );
}

function AlertDialogInDialog() {
  return (
    <Preview title="In dialog">
      <div className="flex justify-center">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            Open dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alert dialog example</DialogTitle>
              <DialogDescription>
                Click the button below to open an alert dialog.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <AlertDialog>
                <AlertDialogTrigger render={<Button />}>
                  Open alert dialog
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Preview>
  );
}
