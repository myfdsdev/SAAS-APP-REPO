import React, { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

let openAlert = null;
let openConfirm = null;

const defaultAlert = {
  title: "Notice",
  description: "",
  actionLabel: "OK",
  variant: "default",
};

export function showAppAlert(options) {
  if (!openAlert) {
    return Promise.resolve();
  }

  return openAlert(typeof options === "string" ? { description: options } : options);
}

export function showAppConfirm(options) {
  if (!openConfirm) {
    return Promise.resolve(false);
  }

  return openConfirm(typeof options === "string" ? { description: options } : options);
}

export function AppAlertHost() {
  const [state, setState] = useState(null);

  useEffect(() => {
    openAlert = (options = {}) =>
      new Promise((resolve) => {
        setState({
          type: "alert",
          ...defaultAlert,
          ...options,
          onResolve: () => resolve(),
        });
      });

    openConfirm = (options = {}) =>
      new Promise((resolve) => {
        setState({
          type: "confirm",
          title: "Are you sure?",
          description: "",
          actionLabel: "Continue",
          cancelLabel: "Cancel",
          variant: "default",
          ...options,
          onResolve: resolve,
        });
      });

    return () => {
      openAlert = null;
      openConfirm = null;
    };
  }, []);

  const handleOpenChange = (open) => {
    if (!open && state) {
      state.onResolve?.(state.type === "confirm" ? false : undefined);
      setState(null);
    }
  };

  const isDestructive = state?.variant === "destructive";

  return (
    <AlertDialog open={!!state} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="border-lime-400/15 bg-[#020806] text-white shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className={isDestructive ? "text-rose-300" : "text-white"}>
            {state?.title}
          </AlertDialogTitle>
          {state?.description && (
            <AlertDialogDescription className="text-lime-100/55">
              {state.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {state?.type === "confirm" && (
            <AlertDialogCancel
              className="border-lime-400/15 bg-black text-lime-100/75 hover:bg-lime-400/10 hover:text-white"
              onClick={() => {
                state.onResolve(false);
                setState(null);
              }}
            >
              {state.cancelLabel}
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            className={
              isDestructive
                ? "bg-rose-500 text-white hover:bg-rose-400"
                : "bg-lime-400 text-black hover:bg-lime-300"
            }
            onClick={() => {
              state?.onResolve?.(state.type === "confirm" ? true : undefined);
              setState(null);
            }}
          >
            {state?.actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
