"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ActionItem } from "./ActionItem";
import { Spinner } from "@/components/ui/spinner";
import type { SessionData, YouTubeVideoData } from "./StructureBuilder";

interface SessionCardProps {
  session: SessionData;
  programId: string;
  videos: YouTubeVideoData[];
  onUpdate: () => void;
}

export function SessionCard({ session, programId, videos, onUpdate }: SessionCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(session.title);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingAction, setAddingAction] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleSaveTitle() {
    if (!title.trim() || title === session.title) {
      setTitle(session.title);
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/programs/${programId}/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!res.ok) throw new Error("Save failed");
      onUpdate();
    } catch (err) {
      console.error("Save failed:", err);
      setTitle(session.title);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${session.title}"? This will delete all actions in this session.`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/programs/${programId}/sessions/${session.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      onUpdate();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddAction(type: "WATCH" | "READ" | "DO" | "REFLECT") {
    setAddingAction(true);
    try {
      const nextOrderIndex = session.actions.length > 0
        ? Math.max(...session.actions.map(a => a.orderIndex)) + 1
        : 0;

      const typeLabels = {
        WATCH: "Watch",
        READ: "Read",
        DO: "Do",
        REFLECT: "Reflect",
      };

      const res = await fetch(`/api/programs/${programId}/sessions/${session.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${typeLabels[type]} ${session.actions.length + 1}`,
          type,
          orderIndex: nextOrderIndex,
        }),
      });
      if (!res.ok) throw new Error("Failed to add action");
      onUpdate();
    } catch (err) {
      console.error("Failed to add action:", err);
    } finally {
      setAddingAction(false);
    }
  }

  async function handleReorderActions(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = session.actions.findIndex((a) => a.id === active.id);
    const newIndex = session.actions.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...session.actions];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const items = reordered.map((a, idx) => ({
      id: a.id,
      orderIndex: idx,
    }));

    try {
      const res = await fetch(`/api/programs/${programId}/sessions/${session.id}/actions/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      onUpdate();
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface-dark border border-surface-border rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-600 hover:text-gray-400 touch-none"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-white"
        >
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {editing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
            autoFocus
            className="flex-1 bg-transparent border-b border-neon-cyan text-white text-xs focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-gray-300 text-xs hover:text-white transition"
          >
            {session.title}
          </button>
        )}

        {saving && <Spinner size="sm" />}

        <span className="text-xs text-gray-600">{session.actions.length} actions</span>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-gray-600 hover:text-red-400 transition disabled:opacity-50"
        >
          {deleting ? (
            <Spinner size="sm" />
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {session.actions.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleReorderActions}
            >
              <SortableContext
                items={session.actions.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                {session.actions.map((action) => (
                  <ActionItem
                    key={action.id}
                    action={action}
                    programId={programId}
                    videos={videos}
                    onUpdate={onUpdate}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          {/* Add action buttons */}
          <div className="flex gap-1 pt-1">
            {(["WATCH", "READ", "DO", "REFLECT"] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleAddAction(type)}
                disabled={addingAction}
                className={`flex-1 py-1.5 text-xs rounded border border-dashed transition disabled:opacity-50 ${
                  type === "WATCH"
                    ? "border-neon-cyan/30 text-neon-cyan/60 hover:border-neon-cyan hover:text-neon-cyan"
                    : type === "REFLECT"
                    ? "border-neon-pink/30 text-neon-pink/60 hover:border-neon-pink hover:text-neon-pink"
                    : type === "DO"
                    ? "border-neon-yellow/30 text-neon-yellow/60 hover:border-neon-yellow hover:text-neon-yellow"
                    : "border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-400"
                }`}
              >
                + {type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
