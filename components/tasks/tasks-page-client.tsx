"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { TaskStatus } from "@prisma/client";

import { KanbanBoard, type CardType, type ColumnType, type CardNoteType } from "@/components/ui/kanban";
import {
  createTask,
  updateTaskStatus,
  deleteTask,
  updateTask,
  addTaskNote,
  deleteTaskNote,
  type TaskWithEvent,
} from "@/actions/tasks";

interface TasksPageClientProps {
  eventId: string;
  initialTasks: TaskWithEvent[];
  locale: string;
}

export function TasksPageClient({
  eventId,
  initialTasks,
  locale,
}: TasksPageClientProps) {
  const t = useTranslations("tasks");
  const isRTL = locale === "he";

  // Convert tasks to cards format
  const initialCards: CardType[] = initialTasks.map((task) => ({
    id: task.id,
    title: task.title,
    column: task.status as ColumnType,
    description: task.description,
    dueDate: task.dueDate,
    notes: task.notes?.map((note) => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })) || [],
  }));

  const [cards, setCards] = useState<CardType[]>(initialCards);
  const [isLoading, setIsLoading] = useState(false);

  const handleCardAdd = useCallback(async (title: string, column: ColumnType) => {
    setIsLoading(true);
    try {
      const result = await createTask(eventId, title, column as TaskStatus);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.task) {
        const newCard: CardType = {
          id: result.task.id,
          title: result.task.title,
          column: result.task.status as ColumnType,
          description: result.task.description,
          dueDate: result.task.dueDate,
          notes: result.task.notes?.map((note) => ({
            id: note.id,
            content: note.content,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          })) || [],
        };
        setCards((prev) => [...prev, newCard]);
        toast.success(t("taskCreated"));
      }
    } catch (error) {
      toast.error(t("errorCreating"));
    } finally {
      setIsLoading(false);
    }
  }, [eventId, t]);

  const handleCardMove = useCallback(async (
    cardId: string,
    newColumn: ColumnType,
    newPosition: number
  ) => {
    try {
      const result = await updateTaskStatus(cardId, newColumn as TaskStatus, newPosition);

      if (result.error) {
        toast.error(result.error);
        // Revert the optimistic update
        const originalTask = initialTasks.find((t) => t.id === cardId);
        if (originalTask) {
          setCards((prev) =>
            prev.map((c) =>
              c.id === cardId ? { ...c, column: originalTask.status as ColumnType } : c
            )
          );
        }
      }
    } catch (error) {
      toast.error(t("errorUpdating"));
    }
  }, [initialTasks, t]);

  const handleCardDelete = useCallback(async (cardId: string) => {
    try {
      const result = await deleteTask(cardId);

      if (result.error) {
        toast.error(result.error);
        // Revert the optimistic update - re-add the card
        const deletedTask = initialTasks.find((t) => t.id === cardId);
        if (deletedTask) {
          setCards((prev) => [
            ...prev,
            {
              id: deletedTask.id,
              title: deletedTask.title,
              column: deletedTask.status as ColumnType,
              description: deletedTask.description,
              dueDate: deletedTask.dueDate,
              notes: deletedTask.notes?.map((note) => ({
                id: note.id,
                content: note.content,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
              })) || [],
            },
          ]);
        }
        return;
      }

      toast.success(t("taskDeleted"));
    } catch (error) {
      toast.error(t("errorDeleting"));
    }
  }, [initialTasks, t]);

  const handleCardUpdate = useCallback(async (cardId: string, title: string) => {
    try {
      const result = await updateTask(cardId, { title });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("taskUpdated"));
    } catch (error) {
      toast.error(t("errorUpdating"));
    }
  }, [t]);

  const handleNoteAdd = useCallback(async (cardId: string, content: string) => {
    try {
      const result = await addTaskNote(cardId, content);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.note) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  notes: [
                    ...(c.notes || []),
                    {
                      id: result.note!.id,
                      content: result.note!.content,
                      createdAt: result.note!.createdAt,
                      updatedAt: result.note!.updatedAt,
                    },
                  ],
                }
              : c
          )
        );
        toast.success(t("noteAdded"));
      }
    } catch (error) {
      toast.error(t("errorAddingNote"));
    }
  }, [t]);

  const handleNoteDelete = useCallback(async (noteId: string) => {
    try {
      const result = await deleteTaskNote(noteId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setCards((prev) =>
        prev.map((c) => ({
          ...c,
          notes: c.notes?.filter((n) => n.id !== noteId) || [],
        }))
      );
      toast.success(t("noteDeleted"));
    } catch (error) {
      toast.error(t("errorDeletingNote"));
    }
  }, [t]);

  const translations = {
    backlog: t("backlog"),
    todo: t("todo"),
    inProgress: t("inProgress"),
    complete: t("complete"),
    addCard: t("addCard"),
    close: t("close"),
    add: t("add"),
    placeholder: t("placeholder"),
    deleteZone: t("deleteZone"),
    addNote: t("addNote"),
    notePlaceholder: t("notePlaceholder"),
  };

  return (
    <div className={`flex-1 flex flex-col rounded-lg border bg-muted/30 ${isRTL ? "direction-rtl" : ""}`}>
      <KanbanBoard
        cards={cards}
        setCards={setCards}
        onCardAdd={handleCardAdd}
        onCardMove={handleCardMove}
        onCardDelete={handleCardDelete}
        onCardUpdate={handleCardUpdate}
        onNoteAdd={handleNoteAdd}
        onNoteDelete={handleNoteDelete}
        isLoading={isLoading}
        translations={translations}
      />
    </div>
  );
}
