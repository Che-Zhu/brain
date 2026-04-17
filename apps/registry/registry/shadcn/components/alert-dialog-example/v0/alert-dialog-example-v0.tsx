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
import { Preview, PreviewWrapper } from "@shadcn/ui/preview";
import { Bluetooth } from "lucide-react";

export default function AlertDialogExampleV0() {
  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <AlertDialogBasic />
      <AlertDialogSmall />
      <AlertDialogWithMedia />
      <AlertDialogSmallWithMedia />
    </PreviewWrapper>
  );
}

function AlertDialogBasic() {
  return (
    <Preview title="Basic">
      <div className="flex justify-center">
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="outline">Default</Button>}
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Preview>
  );
}

function AlertDialogSmall() {
  return (
    <Preview title="Small">
      <div className="flex justify-center">
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="outline">Small</Button>}
          />
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Allow accessory to connect?</AlertDialogTitle>
              <AlertDialogDescription>
                Do you want to allow the USB accessory to connect to this
                device?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Don&apos;t allow</AlertDialogCancel>
              <AlertDialogAction>Allow</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Preview>
  );
}

function AlertDialogWithMedia() {
  return (
    <Preview title="With media">
      <div className="flex justify-center">
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="outline">Default (media)</Button>}
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <Bluetooth className="size-8" />
              </AlertDialogMedia>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and remove your data
                from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Preview>
  );
}

function AlertDialogSmallWithMedia() {
  return (
    <Preview title="Small with media">
      <div className="flex justify-center">
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="outline">Small (media)</Button>}
          />
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia>
                <Bluetooth className="size-8" />
              </AlertDialogMedia>
              <AlertDialogTitle>Allow accessory to connect?</AlertDialogTitle>
              <AlertDialogDescription>
                Do you want to allow the USB accessory to connect to this
                device?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Don&apos;t allow</AlertDialogCancel>
              <AlertDialogAction>Allow</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Preview>
  );
}
