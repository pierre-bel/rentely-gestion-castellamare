import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Bold, Italic, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Heading3, Undo, Redo, Palette, Highlighter, Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailToolbarProps {
  editor: Editor | null;
}

const FONT_SIZES = [
  { label: "Petit", value: "0.85em" },
  { label: "Normal", value: "1em" },
  { label: "Grand", value: "1.25em" },
  { label: "Très grand", value: "1.5em" },
];

const TEXT_COLORS = [
  "#000000", "#333333", "#666666", "#999999",
  "#dc2626", "#ea580c", "#ca8a04", "#16a34a",
  "#2563eb", "#7c3aed", "#db2777", "#0891b2",
];

const HIGHLIGHT_COLORS = [
  "transparent", "#fef08a", "#bbf7d0", "#bfdbfe",
  "#fecaca", "#fed7aa", "#e9d5ff", "#fce7f3",
];

export default function EmailToolbar({ editor }: EmailToolbarProps) {
  if (!editor) return null;

  const ToolBtn = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30">
      {/* Undo / Redo */}
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Annuler">
        <Undo className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Rétablir">
        <Redo className="h-4 w-4" />
      </ToolBtn>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings */}
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Titre 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Titre 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Titre 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolBtn>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Bold / Italic / Strike */}
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Gras"
      >
        <Bold className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italique"
      >
        <Italic className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Barré"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolBtn>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Liste à puces"
      >
        <List className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Liste numérotée"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolBtn>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Couleur du texte">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <p className="text-xs font-medium mb-2">Couleur du texte</p>
          <div className="grid grid-cols-4 gap-1">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => editor.chain().focus().setColor(color).run()}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => editor.chain().focus().unsetColor().run()}
          >
            Réinitialiser
          </Button>
        </PopoverContent>
      </Popover>

      {/* Highlight / Background color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Couleur de fond">
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <p className="text-xs font-medium mb-2">Surlignage</p>
          <div className="grid grid-cols-4 gap-1">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "w-6 h-6 rounded border border-border hover:scale-110 transition-transform",
                  color === "transparent" && "bg-[repeating-conic-gradient(#ccc_0%_25%,transparent_0%_50%)] bg-[length:8px_8px]"
                )}
                style={color !== "transparent" ? { backgroundColor: color } : {}}
                onClick={() => {
                  if (color === "transparent") {
                    editor.chain().focus().unsetHighlight().run();
                  } else {
                    editor.chain().focus().toggleHighlight({ color }).run();
                  }
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
