import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import History from "@tiptap/extension-history";
import HardBreak from "@tiptap/extension-hard-break";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Eye } from "lucide-react";
import EmailToolbar from "./EmailToolbar";

interface EmailBodyEditorProps {
  value: string;
  onChange: (html: string) => void;
}

function editorHtmlToEmailHtml(html: string): string {
  // Wrap the editor output in a styled email container
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">${html}</div>`;
}

function emailHtmlToEditorHtml(html: string): string {
  // Strip the wrapper div if present
  const match = html.match(/<div[^>]*style="[^"]*font-family[^"]*"[^>]*>([\s\S]*)<\/div>\s*$/);
  return match ? match[1] : html;
}

// Re-inject variable placeholders that were escaped
function restoreVariables(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, "{{$1}}");
}

export default function EmailBodyEditor({ value, onChange }: EmailBodyEditorProps) {
  const isWrapped = value.includes("font-family");
  const initialContent = value ? (isWrapped ? emailHtmlToEditorHtml(value) : value) : "<p></p>";

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({ levels: [1, 2, 3] }),
      Bold,
      Italic,
      Strike,
      BulletList,
      OrderedList,
      ListItem,
      History,
      HardBreak,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(editorHtmlToEmailHtml(html));
    },
  });

  // Sync external value changes (e.g., on edit dialog open)
  useEffect(() => {
    if (editor && value) {
      const editorHtml = isWrapped ? emailHtmlToEditorHtml(value) : value;
      if (editor.getHTML() !== editorHtml) {
        editor.commands.setContent(editorHtml);
      }
    }
  }, [value, editor]);

  const generatedHtml = editor ? editorHtmlToEmailHtml(editor.getHTML()) : "";

  return (
    <div className="space-y-3">
      <Label>Corps de l'e-mail *</Label>

      <div className="border rounded-lg overflow-hidden">
        <EmailToolbar editor={editor} />
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-4 min-h-[200px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px]"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Utilisez la barre d'outils pour mettre en forme. Les variables {"{{...}}"} seront remplacées automatiquement.
      </p>

      {/* Live Preview */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm text-muted-foreground">Aperçu</Label>
        </div>
        <div
          className="border rounded-lg p-4 bg-white max-h-[300px] overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: restoreVariables(generatedHtml) }}
        />
      </div>
    </div>
  );
}
