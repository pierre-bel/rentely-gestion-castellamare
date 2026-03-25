import { Extension } from "@tiptap/core";
import Paragraph from "@tiptap/extension-paragraph";
import { TextStyle } from "@tiptap/extension-text-style";

/**
 * Custom Paragraph with indent attribute for Word-style block offset
 */
export const IndentParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      indent: {
        default: 0,
        parseHTML: (element) => {
          const ml = element.style.marginLeft;
          if (ml) {
            const px = parseInt(ml, 10);
            if (!isNaN(px)) return Math.round(px / 40);
          }
          return 0;
        },
        renderHTML: (attributes) => {
          if (!attributes.indent || attributes.indent <= 0) return {};
          return { style: `margin-left: ${attributes.indent * 40}px` };
        },
      },
    };
  },
});

/**
 * FontSize extension using TextStyle mark
 */
export const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// Extend Editor type for custom commands
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}
