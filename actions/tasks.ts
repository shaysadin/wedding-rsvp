"use server";

import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export type TaskNote = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskWithEvent = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  dueDate: Date | null;
  weddingEventId: string;
  createdAt: Date;
  updatedAt: Date;
  notes: TaskNote[];
};

export async function getTasks(eventId: string): Promise<{
  tasks?: TaskWithEvent[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify user owns the event
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: eventId,
        ownerId: user.id,
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const tasks = await prisma.weddingTask.findMany({
      where: {
        weddingEventId: eventId,
      },
      include: {
        notes: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [
        { status: "asc" },
        { position: "asc" },
        { createdAt: "asc" },
      ],
    });

    return { tasks };
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return { error: "Failed to fetch tasks" };
  }
}

export async function createTask(
  eventId: string,
  title: string,
  status: TaskStatus = "BACKLOG"
): Promise<{
  task?: TaskWithEvent;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify user owns the event
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: eventId,
        ownerId: user.id,
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Get the max position for the given status
    const maxPosition = await prisma.weddingTask.aggregate({
      where: {
        weddingEventId: eventId,
        status,
      },
      _max: {
        position: true,
      },
    });

    const newPosition = (maxPosition._max.position ?? -1) + 1;

    const task = await prisma.weddingTask.create({
      data: {
        weddingEventId: eventId,
        title,
        status,
        position: newPosition,
      },
      include: {
        notes: true,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { task };
  } catch (error) {
    console.error("Error creating task:", error);
    return { error: "Failed to create task" };
  }
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  newPosition: number
): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify user owns the task's event
    const task = await prisma.weddingTask.findFirst({
      where: {
        id: taskId,
      },
      include: {
        weddingEvent: true,
      },
    });

    if (!task || task.weddingEvent.ownerId !== user.id) {
      return { error: "Task not found" };
    }

    await prisma.weddingTask.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        position: newPosition,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error) {
    console.error("Error updating task:", error);
    return { error: "Failed to update task" };
  }
}

export async function deleteTask(taskId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify user owns the task's event
    const task = await prisma.weddingTask.findFirst({
      where: {
        id: taskId,
      },
      include: {
        weddingEvent: true,
      },
    });

    if (!task || task.weddingEvent.ownerId !== user.id) {
      return { error: "Task not found" };
    }

    await prisma.weddingTask.delete({
      where: { id: taskId },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error) {
    console.error("Error deleting task:", error);
    return { error: "Failed to delete task" };
  }
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string | null;
    dueDate?: Date | null;
  }
): Promise<{
  task?: TaskWithEvent;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify user owns the task's event
    const existingTask = await prisma.weddingTask.findFirst({
      where: {
        id: taskId,
      },
      include: {
        weddingEvent: true,
      },
    });

    if (!existingTask || existingTask.weddingEvent.ownerId !== user.id) {
      return { error: "Task not found" };
    }

    const task = await prisma.weddingTask.update({
      where: { id: taskId },
      data,
      include: {
        notes: true,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { task };
  } catch (error) {
    console.error("Error updating task:", error);
    return { error: "Failed to update task" };
  }
}

// Note management actions
export async function addTaskNote(
  taskId: string,
  content: string
): Promise<{
  note?: TaskNote;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify user owns the task's event
    const task = await prisma.weddingTask.findFirst({
      where: { id: taskId },
      include: { weddingEvent: true },
    });

    if (!task || task.weddingEvent.ownerId !== user.id) {
      return { error: "Task not found" };
    }

    const note = await prisma.taskNote.create({
      data: {
        taskId,
        content,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { note };
  } catch (error) {
    console.error("Error adding note:", error);
    return { error: "Failed to add note" };
  }
}

export async function updateTaskNote(
  noteId: string,
  content: string
): Promise<{
  note?: TaskNote;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify user owns the note's task's event
    const existingNote = await prisma.taskNote.findFirst({
      where: { id: noteId },
      include: {
        task: {
          include: { weddingEvent: true },
        },
      },
    });

    if (!existingNote || existingNote.task.weddingEvent.ownerId !== user.id) {
      return { error: "Note not found" };
    }

    const note = await prisma.taskNote.update({
      where: { id: noteId },
      data: { content },
    });

    revalidatePath("/dashboard/tasks");
    return { note };
  } catch (error) {
    console.error("Error updating note:", error);
    return { error: "Failed to update note" };
  }
}

export async function deleteTaskNote(noteId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify user owns the note's task's event
    const existingNote = await prisma.taskNote.findFirst({
      where: { id: noteId },
      include: {
        task: {
          include: { weddingEvent: true },
        },
      },
    });

    if (!existingNote || existingNote.task.weddingEvent.ownerId !== user.id) {
      return { error: "Note not found" };
    }

    await prisma.taskNote.delete({
      where: { id: noteId },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error) {
    console.error("Error deleting note:", error);
    return { error: "Failed to delete note" };
  }
}
