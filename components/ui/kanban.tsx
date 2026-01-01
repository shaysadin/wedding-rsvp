"use client";

import React, {
  Dispatch,
  SetStateAction,
  useState,
  DragEvent,
  FormEvent,
  useRef,
  useEffect,
} from "react";
import { Plus, Trash2, Flame, GripVertical, ChevronDown, ChevronUp, X, Pencil, Check, StickyNote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type ColumnType = "BACKLOG" | "TODO" | "DOING" | "DONE";

export type CardNoteType = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CardType = {
  id: string;
  title: string;
  column: ColumnType;
  description?: string | null;
  dueDate?: Date | null;
  notes?: CardNoteType[];
};

interface KanbanBoardProps {
  cards: CardType[];
  setCards: Dispatch<SetStateAction<CardType[]>>;
  onCardAdd?: (title: string, column: ColumnType) => Promise<void>;
  onCardMove?: (cardId: string, newColumn: ColumnType, newPosition: number) => Promise<void>;
  onCardDelete?: (cardId: string) => Promise<void>;
  onCardUpdate?: (cardId: string, title: string) => Promise<void>;
  onNoteAdd?: (cardId: string, content: string) => Promise<void>;
  onNoteUpdate?: (noteId: string, content: string) => Promise<void>;
  onNoteDelete?: (noteId: string) => Promise<void>;
  isLoading?: boolean;
  translations?: {
    backlog: string;
    todo: string;
    inProgress: string;
    complete: string;
    addCard: string;
    close: string;
    add: string;
    placeholder: string;
    deleteZone: string;
    addNote?: string;
    notePlaceholder?: string;
  };
}

// Stage-based color configurations
const stageColors: Record<ColumnType, {
  glass: string;
  border: string;
  accent: string;
  glow: string;
}> = {
  BACKLOG: {
    glass: "bg-slate-500/10 dark:bg-slate-400/10",
    border: "border-slate-300/50 dark:border-slate-600/50",
    accent: "text-slate-600 dark:text-slate-400",
    glow: "shadow-slate-500/10",
  },
  TODO: {
    glass: "bg-amber-500/10 dark:bg-amber-400/10",
    border: "border-amber-300/50 dark:border-amber-600/50",
    accent: "text-amber-600 dark:text-amber-400",
    glow: "shadow-amber-500/10",
  },
  DOING: {
    glass: "bg-blue-500/10 dark:bg-blue-400/10",
    border: "border-blue-300/50 dark:border-blue-600/50",
    accent: "text-blue-600 dark:text-blue-400",
    glow: "shadow-blue-500/10",
  },
  DONE: {
    glass: "bg-emerald-500/10 dark:bg-emerald-400/10",
    border: "border-emerald-300/50 dark:border-emerald-600/50",
    accent: "text-emerald-600 dark:text-emerald-400",
    glow: "shadow-emerald-500/10",
  },
};

export function KanbanBoard({
  cards,
  setCards,
  onCardAdd,
  onCardMove,
  onCardDelete,
  onCardUpdate,
  onNoteAdd,
  onNoteUpdate,
  onNoteDelete,
  isLoading = false,
  translations = {
    backlog: "Backlog",
    todo: "TODO",
    inProgress: "In Progress",
    complete: "Complete",
    addCard: "Add card",
    close: "Close",
    add: "Add",
    placeholder: "Add new task...",
    deleteZone: "Delete",
    addNote: "Add note",
    notePlaceholder: "Write a note...",
  },
}: KanbanBoardProps) {
  return (
    <div className="flex-1 w-full p-4">
      <div className="flex w-full gap-3 items-stretch">
        <Column
          title={translations.backlog}
          column="BACKLOG"
          headingColor="text-muted-foreground"
          cards={cards}
          setCards={setCards}
          onCardAdd={onCardAdd}
          onCardMove={onCardMove}
          onCardUpdate={onCardUpdate}
          onNoteAdd={onNoteAdd}
          onNoteUpdate={onNoteUpdate}
          onNoteDelete={onNoteDelete}
          translations={translations}
          isLoading={isLoading}
        />
        <Column
          title={translations.todo}
          column="TODO"
          headingColor="text-yellow-600 dark:text-yellow-400"
          cards={cards}
          setCards={setCards}
          onCardAdd={onCardAdd}
          onCardMove={onCardMove}
          onCardUpdate={onCardUpdate}
          onNoteAdd={onNoteAdd}
          onNoteUpdate={onNoteUpdate}
          onNoteDelete={onNoteDelete}
          translations={translations}
          isLoading={isLoading}
        />
        <Column
          title={translations.inProgress}
          column="DOING"
          headingColor="text-blue-600 dark:text-blue-400"
          cards={cards}
          setCards={setCards}
          onCardAdd={onCardAdd}
          onCardMove={onCardMove}
          onCardUpdate={onCardUpdate}
          onNoteAdd={onNoteAdd}
          onNoteUpdate={onNoteUpdate}
          onNoteDelete={onNoteDelete}
          translations={translations}
          isLoading={isLoading}
        />
        <Column
          title={translations.complete}
          column="DONE"
          headingColor="text-emerald-600 dark:text-emerald-400"
          cards={cards}
          setCards={setCards}
          onCardAdd={onCardAdd}
          onCardMove={onCardMove}
          onCardUpdate={onCardUpdate}
          onNoteAdd={onNoteAdd}
          onNoteUpdate={onNoteUpdate}
          onNoteDelete={onNoteDelete}
          translations={translations}
          isLoading={isLoading}
        />
        <BurnBarrel
          setCards={setCards}
          onCardDelete={onCardDelete}
          translations={translations}
        />
      </div>
    </div>
  );
}

type ColumnProps = {
  title: string;
  headingColor: string;
  cards: CardType[];
  column: ColumnType;
  setCards: Dispatch<SetStateAction<CardType[]>>;
  onCardAdd?: (title: string, column: ColumnType) => Promise<void>;
  onCardMove?: (cardId: string, newColumn: ColumnType, newPosition: number) => Promise<void>;
  onCardUpdate?: (cardId: string, title: string) => Promise<void>;
  onNoteAdd?: (cardId: string, content: string) => Promise<void>;
  onNoteUpdate?: (noteId: string, content: string) => Promise<void>;
  onNoteDelete?: (noteId: string) => Promise<void>;
  translations: KanbanBoardProps["translations"];
  isLoading: boolean;
};

const Column = ({
  title,
  headingColor,
  cards,
  column,
  setCards,
  onCardAdd,
  onCardMove,
  onCardUpdate,
  onNoteAdd,
  onNoteUpdate,
  onNoteDelete,
  translations,
  isLoading,
}: ColumnProps) => {
  const [active, setActive] = useState(false);

  const handleDragStart = (e: DragEvent, card: CardType) => {
    e.dataTransfer.setData("cardId", card.id);
  };

  const handleDragEnd = async (e: DragEvent) => {
    const cardId = e.dataTransfer.getData("cardId");

    setActive(false);
    clearHighlights();

    const indicators = getIndicators();
    const { element } = getNearestIndicator(e, indicators);

    const before = element.dataset.before || "-1";

    if (before !== cardId) {
      let copy = [...cards];

      let cardToTransfer = copy.find((c) => c.id === cardId);
      if (!cardToTransfer) return;

      const oldColumn = cardToTransfer.column;
      cardToTransfer = { ...cardToTransfer, column };

      copy = copy.filter((c) => c.id !== cardId);

      const moveToBack = before === "-1";
      let newPosition: number;

      if (moveToBack) {
        copy.push(cardToTransfer);
        newPosition = copy.filter(c => c.column === column).length - 1;
      } else {
        const insertAtIndex = copy.findIndex((el) => el.id === before);
        if (insertAtIndex === undefined) return;

        copy.splice(insertAtIndex, 0, cardToTransfer);
        newPosition = copy.filter(c => c.column === column).findIndex(c => c.id === cardId);
      }

      setCards(copy);

      if (onCardMove && (oldColumn !== column || true)) {
        await onCardMove(cardId, column, newPosition);
      }
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    highlightIndicator(e);
    setActive(true);
  };

  const clearHighlights = (els?: HTMLElement[]) => {
    const indicators = els || getIndicators();
    indicators.forEach((i) => {
      i.style.opacity = "0";
    });
  };

  const highlightIndicator = (e: DragEvent) => {
    const indicators = getIndicators();
    clearHighlights(indicators);
    const el = getNearestIndicator(e, indicators);
    el.element.style.opacity = "1";
  };

  const getNearestIndicator = (e: DragEvent, indicators: HTMLElement[]) => {
    const DISTANCE_OFFSET = 50;

    const el = indicators.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientY - (box.top + DISTANCE_OFFSET);

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      {
        offset: Number.NEGATIVE_INFINITY,
        element: indicators[indicators.length - 1],
      }
    );

    return el;
  };

  const getIndicators = () => {
    return Array.from(
      document.querySelectorAll(
        `[data-column="${column}"]`
      ) as unknown as HTMLElement[]
    );
  };

  const handleDragLeave = () => {
    clearHighlights();
    setActive(false);
  };

  const filteredCards = cards.filter((c) => c.column === column);

  return (
    <div className="flex-1 flex flex-col min-w-[150px]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className={cn("font-medium", headingColor)}>{title}</h3>
        <span className="rounded text-sm text-muted-foreground">
          {filteredCards.length}
        </span>
      </div>
      <div
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "w-full rounded-lg border-2 border-dashed transition-colors p-1.5 min-h-[80px] space-y-2",
          active
            ? "border-primary/50 bg-primary/5"
            : "border-transparent bg-[#aeaeae4d]"
        )}
      >
        {filteredCards.map((c) => {
          return (
            <Card
              key={c.id}
              {...c}
              handleDragStart={handleDragStart}
              setCards={setCards}
              onCardUpdate={onCardUpdate}
              onNoteAdd={onNoteAdd}
              onNoteUpdate={onNoteUpdate}
              onNoteDelete={onNoteDelete}
              translations={translations}
            />
          );
        })}
        <DropIndicator beforeId={null} column={column} />
        <AddCard
          column={column}
          setCards={setCards}
          onCardAdd={onCardAdd}
          translations={translations}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

type CardProps = CardType & {
  handleDragStart: (e: DragEvent, card: CardType) => void;
  setCards: Dispatch<SetStateAction<CardType[]>>;
  onCardUpdate?: (cardId: string, title: string) => Promise<void>;
  onNoteAdd?: (cardId: string, content: string) => Promise<void>;
  onNoteUpdate?: (noteId: string, content: string) => Promise<void>;
  onNoteDelete?: (noteId: string) => Promise<void>;
  translations?: KanbanBoardProps["translations"];
};

const Card = ({
  title,
  id,
  column,
  description,
  dueDate,
  notes = [],
  handleDragStart,
  setCards,
  onCardUpdate,
  onNoteAdd,
  onNoteUpdate,
  onNoteDelete,
  translations,
}: CardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const colors = stageColors[column];

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== title) {
      if (onCardUpdate) {
        await onCardUpdate(id, editedTitle.trim());
      }
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: editedTitle.trim() } : c))
      );
    } else {
      setEditedTitle(title);
    }
    setIsEditing(false);
  };

  const handleAddNote = async () => {
    if (newNote.trim() && onNoteAdd) {
      await onNoteAdd(id, newNote.trim());
      setNewNote("");
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (onNoteDelete) {
      await onNoteDelete(noteId);
    }
  };

  return (
    <>
      <DropIndicator beforeId={id} column={column} />
      <motion.div
        layout
        layoutId={id}
        className={cn(
          "rounded-lg border backdrop-blur-md shadow-lg transition-all",
          colors.glass,
          colors.border,
          colors.glow,
          "hover:shadow-xl"
        )}
      >
        {/* Main card header - draggable */}
        <div
          draggable={!isEditing}
          onDragStart={(e: React.DragEvent<HTMLDivElement>) =>
            handleDragStart(e, { title, id, column, description, dueDate, notes })
          }
          className={cn("px-3 py-2", !isEditing && "cursor-grab active:cursor-grabbing")}
        >
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={inputRef}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveTitle();
                  }
                  if (e.key === "Escape") {
                    setEditedTitle(title);
                    setIsEditing(false);
                  }
                }}
                className="w-full bg-white/30 dark:bg-black/20 rounded p-2 text-sm font-medium text-foreground outline-none resize-none border border-primary/50"
                rows={Math.max(2, Math.ceil(editedTitle.length / 30))}
              />
              <div className="flex justify-end gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditedTitle(title);
                    setIsEditing(false);
                  }}
                  className="p-1.5 rounded hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveTitle();
                  }}
                  className="p-1.5 rounded hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
                >
                  <Check className="h-4 w-4 text-emerald-500" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <GripVertical className={cn("h-4 w-4 shrink-0 opacity-50 mt-0.5", colors.accent)} />
              <p className="text-sm font-medium text-foreground flex-1 break-words">{title}</p>
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                {notes.length > 0 && (
                  <span className={cn("text-xs flex items-center gap-0.5", colors.accent)}>
                    <StickyNote className="h-3 w-3" />
                    {notes.length}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="p-1 rounded hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="p-1 rounded hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          )}

          {dueDate && !isEditing && (
            <p className={cn("text-xs mt-1 ml-6", colors.accent)}>
              {new Date(dueDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Expandable notes section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-1 border-t border-white/10 dark:border-black/10">
                {/* Notes list */}
                <div className="space-y-2 mb-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="group flex items-start gap-2 text-xs bg-white/30 dark:bg-black/20 rounded p-2"
                    >
                      <p className="flex-1 text-foreground/80 whitespace-pre-wrap">{note.content}</p>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 transition-all"
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add note */}
                {isAddingNote ? (
                  <div className="space-y-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder={translations?.notePlaceholder}
                      className="w-full text-xs bg-white/30 dark:bg-black/20 rounded p-2 text-foreground placeholder-muted-foreground outline-none resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setIsAddingNote(false);
                          setNewNote("");
                        }}
                        className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {translations?.close}
                      </button>
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                        className={cn(
                          "px-2 py-1 text-xs rounded transition-colors",
                          colors.glass,
                          colors.accent,
                          "hover:opacity-80 disabled:opacity-50"
                        )}
                      >
                        {translations?.add}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingNote(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    {translations?.addNote}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

type DropIndicatorProps = {
  beforeId: string | null;
  column: string;
};

const DropIndicator = ({ beforeId, column }: DropIndicatorProps) => {
  return (
    <div
      data-before={beforeId || "-1"}
      data-column={column}
      className="my-0.5 h-0.5 w-full rounded-full bg-primary opacity-0 transition-opacity"
    />
  );
};

const BurnBarrel = ({
  setCards,
  onCardDelete,
  translations,
}: {
  setCards: Dispatch<SetStateAction<CardType[]>>;
  onCardDelete?: (cardId: string) => Promise<void>;
  translations?: KanbanBoardProps["translations"];
}) => {
  const [active, setActive] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setActive(true);
  };

  const handleDragLeave = () => {
    setActive(false);
  };

  const handleDragEnd = async (e: DragEvent) => {
    const cardId = e.dataTransfer.getData("cardId");

    setCards((pv) => pv.filter((c) => c.id !== cardId));

    if (onCardDelete) {
      await onCardDelete(cardId);
    }

    setActive(false);
  };

  return (
    <div className="flex-1 flex flex-col min-w-[150px]">
      <div className="mb-3 h-6" />
      <div
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex-1 min-h-[80px] grid place-content-center rounded-lg border-2 border-dashed transition-colors",
          active
            ? "border-red-500 bg-red-500/10 text-red-500"
            : "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
        )}
      >
        {active ? (
          <Flame className="animate-bounce" size={20} />
        ) : (
          <Trash2 size={20} />
        )}
      </div>
    </div>
  );
};

type AddCardProps = {
  column: ColumnType;
  setCards: Dispatch<SetStateAction<CardType[]>>;
  onCardAdd?: (title: string, column: ColumnType) => Promise<void>;
  translations?: KanbanBoardProps["translations"];
  isLoading: boolean;
};

const AddCard = ({ column, setCards, onCardAdd, translations, isLoading }: AddCardProps) => {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!text.trim().length || submitting) return;

    setSubmitting(true);

    try {
      if (onCardAdd) {
        await onCardAdd(text.trim(), column);
      } else {
        const newCard: CardType = {
          column,
          title: text.trim(),
          id: Math.random().toString(),
          notes: [],
        };
        setCards((pv) => [...pv, newCard]);
      }
      setText("");
      setAdding(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {adding ? (
        <motion.form layout onSubmit={handleSubmit}>
          <textarea
            onChange={(e) => setText(e.target.value)}
            value={text}
            autoFocus
            placeholder={translations?.placeholder}
            className="w-full rounded-lg border border-primary/50 bg-primary/5 p-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={submitting}
          />
          <div className="mt-1.5 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setText("");
              }}
              className="px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              disabled={submitting}
            >
              {translations?.close}
            </button>
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <span>{translations?.add}</span>
              <Plus size={16} />
            </button>
          </div>
        </motion.form>
      ) : (
        <motion.button
          layout
          onClick={() => setAdding(true)}
          disabled={isLoading}
          className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <span>{translations?.addCard}</span>
          <Plus size={16} />
        </motion.button>
      )}
    </>
  );
};

export default KanbanBoard;
