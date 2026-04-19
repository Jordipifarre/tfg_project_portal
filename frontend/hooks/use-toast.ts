import * as React from "react"

export type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

let memoryState: any = { toasts: [] }
let listeners: any[] = []

export function toast(props: ToastProps) {
  const id = Math.random().toString(36).substr(2, 9)
  const newToast = { id, ...props }
  memoryState = { toasts: [...memoryState.toasts, newToast] }
  listeners.forEach((listener) => listener(memoryState))
  
  setTimeout(() => {
    memoryState = {
      toasts: memoryState.toasts.filter((t: any) => t.id !== id)
    }
    listeners.forEach((listener) => listener(memoryState))
  }, 3000)
}

export function useToast() {
  const [state, setState] = React.useState(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [state])

  return {
    ...state,
    toast,
  }
}
