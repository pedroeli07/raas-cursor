// Adapted from: https://ui.shadcn.com/docs/components/toast
import {
  type ToastActionElement,
  type ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000 // Change from 1000000 to 5000 (5 seconds)

type ToastOptions = {
  duration?: number;
}

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  duration?: number
}

const actionTypes = {
  addToast: "ADD_TOAST",
  updateToast: "UPDATE_TOAST",
  dismissToast: "DISMISS_TOAST",
  removeToast: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["addToast"]
      toast: ToasterToast
    }
  | {
      type: ActionType["updateToast"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["dismissToast"]
      toastId?: string
    }
  | {
      type: ActionType["removeToast"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: actionTypes.removeToast,
      toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.addToast:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.updateToast:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.dismissToast: {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
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
      }
    }
    case actionTypes.removeToast:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

export function useToast() {
  return {
    toast: (props: Toast & ToastOptions) => {
      const id = genId()
      const duration = props.duration || TOAST_REMOVE_DELAY;

      const update = (props: Toast) =>
        dispatch({
          type: actionTypes.updateToast,
          toast: { ...props, id },
        })

      const dismiss = () =>
        dispatch({ type: actionTypes.dismissToast, toastId: id })

      dispatch({
        type: actionTypes.addToast,
        toast: {
          ...props,
          id,
          open: true,
          duration: duration,
          onOpenChange: (open: boolean) => {
            if (!open) {
              dismiss()
            }
          },
        },
      })

      // Set up auto-dismiss timer with the specified duration
      const timeoutId = setTimeout(() => {
        dismiss()
      }, duration)

      return {
        id,
        dismiss,
        update,
      }
    },
    dismiss: (toastId?: string) =>
      dispatch({ type: actionTypes.dismissToast, toastId }),
    toasts: memoryState.toasts,
  }
} 