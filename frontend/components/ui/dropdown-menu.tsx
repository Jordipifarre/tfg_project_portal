import * as React from "react"
export const DropdownMenu = ({ children }: { children: React.ReactNode }) => <div className="relative inline-block text-left">{children}</div>
export const DropdownMenuTrigger = ({ children, asChild }: any) => <div className="inline-block">{children}</div>
export const DropdownMenuContent = ({ children, align, className }: any) => (
  <div className={`absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md ${align === 'end' ? 'right-0' : 'left-0'} ${className}`}>
    {children}
  </div>
)
export const DropdownMenuItem = ({ children, onClick, className }: any) => (
  <div
    onClick={onClick}
    className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${className}`}
  >
    {children}
  </div>
)
