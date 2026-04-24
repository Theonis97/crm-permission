"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

type Item = {
  id: string
  title: string
  body: string
  kind: string | null
  isRead: boolean
  createdAt: string
}

const POLL_MS = 45_000

export function StaffNotificationBell() {
  const [items, setItems] = useState<Item[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const isFirstPollRef = useRef(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      if (!data.success) return
      const next: Item[] = data.items || []
      setUnreadCount(data.unreadCount ?? 0)

      const canDesktop =
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"

      for (const it of next) {
        if (it.isRead) continue
        if (!seenIdsRef.current.has(it.id)) {
          if (!isFirstPollRef.current && canDesktop) {
            try {
              new Notification(it.title, { body: it.body })
            } catch {
              /* ignore */
            }
          }
          seenIdsRef.current.add(it.id)
        }
      }
      isFirstPollRef.current = false

      setItems(next)
    } catch {
      /* silencieux */
    }
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), POLL_MS)
    const onFocus = () => void load()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(t)
      window.removeEventListener("focus", onFocus)
    }
  }, [load])

  const requestDesktop = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    const p = await Notification.requestPermission()
    if (p === "granted") void load()
  }

  const markRead = async (ids: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      void load()
    } catch {
      /* ignore */
    }
  }

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      })
      seenIdsRef.current = new Set()
      void load()
    } catch {
      /* ignore */
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" title="Alertes stock / réappro">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[min(70vh,420px)] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Alertes</span>
          <div className="flex gap-1">
            {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted" && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline font-normal"
                onClick={(e) => {
                  e.preventDefault()
                  void requestDesktop()
                }}
              >
                Petite fenêtre système
              </button>
            )}
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:underline font-normal"
                onClick={(e) => {
                  e.preventDefault()
                  void markAllRead()
                }}
              >
                Tout lu
              </button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-6 text-sm text-center text-muted-foreground">Aucune alerte récente</div>
        ) : (
          items.map((it) => (
            <DropdownMenuItem
              key={it.id}
              className={`flex flex-col items-stretch gap-0.5 cursor-pointer whitespace-normal ${!it.isRead ? "bg-blue-50/80" : ""}`}
              onClick={() => {
                if (!it.isRead) void markRead([it.id])
              }}
            >
              <span className="font-medium text-sm">{it.title}</span>
              <span className="text-xs text-muted-foreground">{it.body}</span>
              <span className="text-[10px] text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(it.createdAt), { addSuffix: true, locale: fr })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
