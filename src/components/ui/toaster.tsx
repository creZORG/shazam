

"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { Button } from "./button"
import { Copy } from "lucide-react"
import { useState } from "react"
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

function ToastComponent({ toastData }: { toastData: ToasterToast }) {
  const { id, title, description, action, ...props } = toastData;
  const [isCopied, setIsCopied] = useState(false);
  const descriptionText = typeof description === 'string' ? description : '';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  }

  const onCopy = () => {
    if (descriptionText) {
      handleCopy(descriptionText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }

  return (
    <Toast key={id} {...props}>
      <div className="flex-grow overflow-hidden grid gap-1">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && (
          <ToastDescription className="truncate">
            {description}
          </ToastDescription>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
          {descriptionText && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopy}>
                {isCopied ? "OK" : <Copy className="h-4 w-4" />}
            </Button>
          )}
          {action}
      </div>
      <ToastClose />
    </Toast>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function (toast) {
        return <ToastComponent key={toast.id} toastData={toast} />
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
