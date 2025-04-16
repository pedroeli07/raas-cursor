// Adapted from: https://ui.shadcn.com/docs/components/toast
import { ReactNode } from "react";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000000;

type ToastActionElement = ReactNode;

type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  duration?: number;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  action?: ToastActionElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const actionTypes = {
  addToast: "addToast",
  updateToast: "updateToast",
  dismissToast: "dismissToast",
  removeToast: "removeToast",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["addToast"];
      toast: ToastProps;
    }
  | {
      type: ActionType["updateToast"];
      toast: Partial<ToastProps>;
    }
  | {
      type: ActionType["dismissToast"];
      toastId?: string;
    }
  | {
      type: ActionType["removeToast"];
      toastId?: string;
    };

interface State {
  toasts: ToastProps[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "removeToast",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "addToast":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "updateToast":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "dismissToast": {
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case "removeToast":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type Toast = Omit<ToastProps, "id">;

export function useToast() {
  const toast = (props: Toast) => {
    const id = genId();

    const update = (props: ToastProps) =>
      dispatch({
        type: "updateToast",
        toast: { ...props, id },
      });

    const dismiss = () =>
      dispatch({ type: "dismissToast", toastId: id });

    dispatch({
      type: "addToast",
      toast: {
        ...props,
        id,
        open: true,
        onOpenChange: (open: boolean) => {
          if (!open) {
            dismiss();
          }
        },
      },
    });

    return {
      id,
      dismiss,
      update,
    };
  };

  function showToast(props: Toast) {
    return toast(props);
  }
  
  // Add utility methods to the base toast function
  showToast.success = (props: Omit<Toast, "variant">) =>
    toast({ ...props, variant: "success" });
    
  showToast.warning = (props: Omit<Toast, "variant">) =>
    toast({ ...props, variant: "warning" });
    
  showToast.info = (props: Omit<Toast, "variant">) =>
    toast({ ...props, variant: "info" });
    
  showToast.error = (props: Omit<Toast, "variant">) =>
    toast({ ...props, variant: "destructive" });
    
  showToast.dismiss = (toastId?: string) => 
    dispatch({ type: "dismissToast", toastId });

  return {
    toast: showToast,
    dismiss: (toastId?: string) => dispatch({ type: "dismissToast", toastId }),
    toasts: memoryState.toasts,
  };
}