"use client";

import { Children, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorderLinks } from "@/app/actions";

/**
 * Lista que se reordena arrastrando el asa (⋮⋮) con ratón o dedo.
 * Los hijos deben ser <li data-id> en el mismo orden que `ids`.
 */
export function SortableList({ ids, children, className }: { ids: string[]; children: React.ReactNode; className?: string }) {
  const items = Children.toArray(children);
  const [order, setOrder] = useState(ids);
  const [dragging, setDragging] = useState<string | null>(null);
  const [, start] = useTransition();
  const list = useRef<HTMLUListElement>(null);
  const router = useRouter();

  function onPointerDown(e: React.PointerEvent) {
    const handle = (e.target as HTMLElement).closest("[data-drag-handle]");
    const li = handle?.closest<HTMLElement>("[data-id]");
    if (!handle || !li) return;
    e.preventDefault();
    const id = li.dataset.id!;
    setDragging(id);
    li.classList.add("is-dragging");
    let current = order;

    const move = (ev: PointerEvent) => {
      const rows = Array.from(list.current!.querySelectorAll<HTMLElement>(":scope > li[data-id]"));
      const over = rows.find((r) => {
        const b = r.getBoundingClientRect();
        return ev.clientY >= b.top && ev.clientY <= b.bottom;
      });
      if (!over || over.dataset.id === id) return;
      const from = current.indexOf(id);
      const to = current.indexOf(over.dataset.id!);
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, id);
      current = next;
      setOrder(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragging(null);
      li.classList.remove("is-dragging");
      if (current.join() !== ids.join()) {
        start(async () => {
          const res = await reorderLinks(current);
          if (res.error) setOrder(ids);
          router.refresh();
        });
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <ul ref={list} className={className} onPointerDown={onPointerDown} data-dragging={dragging ?? undefined}>
      {order.map((id) => items[ids.indexOf(id)] ?? null)}
    </ul>
  );
}
