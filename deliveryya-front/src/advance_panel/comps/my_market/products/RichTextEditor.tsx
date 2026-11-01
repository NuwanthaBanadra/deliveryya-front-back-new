import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Link } from '@tiptap/extension-link';
import {
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  TableCellsIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import './RichTextEditor.css';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const mergeStyleAttributes = (...styles: Array<string | null | undefined>) => {
  return styles.filter(Boolean).join('; ');
};

const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
        HTMLAttributes: {
          style: 'border-collapse: collapse; table-layout: fixed; width: 100%; border: 1px solid #d1d5db',
        },
      }),
      TableRow,
      TableHeader.extend({
        renderHTML({ HTMLAttributes }) {
          return [
            'th',
            {
              ...HTMLAttributes,
              style: mergeStyleAttributes(
                'border: 1px solid #d1d5db; padding: 0.5em; vertical-align: top; text-align: left; font-weight: 700; background-color: #f3f4f6',
                HTMLAttributes.style,
              ),
            },
            0,
          ];
        },
        addAttributes() {
          return {
            ...this.parent?.(),
            backgroundColor: {
              default: null,
              parseHTML: element => {
                return element.style.backgroundColor || null;
              },
              renderHTML: attributes => {
                if (!attributes.backgroundColor) {
                  return {};
                }
                return {
                  style: mergeStyleAttributes(
                    attributes.style as string | undefined,
                    `background-color: ${attributes.backgroundColor}`,
                  ),
                };
              },
            },
          };
        },
      }),
      TableCell.extend({
        renderHTML({ HTMLAttributes }) {
          return [
            'td',
            {
              ...HTMLAttributes,
              style: mergeStyleAttributes(
                'border: 1px solid #d1d5db; padding: 0.5em; vertical-align: top',
                HTMLAttributes.style,
              ),
            },
            0,
          ];
        },
        addAttributes() {
          return {
            ...this.parent?.(),
            backgroundColor: {
              default: null,
              parseHTML: element => {
                return element.style.backgroundColor || null;
              },
              renderHTML: attributes => {
                if (!attributes.backgroundColor) {
                  return {};
                }
                return {
                  style: mergeStyleAttributes(
                    attributes.style as string | undefined,
                    `background-color: ${attributes.backgroundColor}`,
                  ),
                };
              },
            },
          };
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    editor?.chain().focus().setColor(color).run();
  };

  const handleHighlightColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    editor?.chain().focus().setHighlight({ color }).run();
  };

  const handleCellBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const color = e.target.value;
    if (editor) {
      editor.chain().focus().setCellAttribute('backgroundColor', color).run();
    }
  };

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const removeLink = () => {
    editor?.chain().focus().unsetLink().run();
  };

  useEffect(() => {
    if (editor && typeof content === 'string' && editor.getHTML() !== content) {
      editor.commands.setContent(content, {});
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border-2 border-gray-200 rounded-lg focus-within:border-[#F59B0F] focus-within:ring-2 focus-within:ring-[#F59B0F]/20 transition-all duration-300">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Bold"
        >
          <BoldIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Italic"
        >
          <ItalicIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('underline') ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Underline"
        >
          <span className="font-bold text-lg underline">U</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('strike') ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Strikethrough"
        >
          <span className="font-bold text-lg line-through">S</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={`px-2 py-2 rounded hover:bg-gray-200 transition-colors text-sm ${editor.isActive('subscript') ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Subscript"
        >
          X<sub>2</sub>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={`px-2 py-2 rounded hover:bg-gray-200 transition-colors text-sm ${editor.isActive('superscript') ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Superscript"
        >
          X<sup>2</sup>
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-2 rounded hover:bg-gray-200 transition-colors font-semibold ${editor.isActive('heading', { level: 1 }) ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Heading 1"
        >
          H1
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-2 rounded hover:bg-gray-200 transition-colors font-semibold ${editor.isActive('heading', { level: 2 }) ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Heading 2"
        >
          H2
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-2 rounded hover:bg-gray-200 transition-colors font-semibold ${editor.isActive('heading', { level: 3 }) ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Heading 3"
        >
          H3
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bulletList') ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Bullet List"
        >
          <ListBulletIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('orderedList') ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Numbered List"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4h1v1H3V4zm0 3h1v1H3V7zm0 3h1v1H3v-1zm3-6h11v1H6V4zm0 3h11v1H6V7zm0 3h11v1H6v-1z" />
          </svg>
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Align Left"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 4h16v2H2V4zm0 4h10v2H2V8zm0 4h16v2H2v-2zm0 4h10v2H2v-2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Align Center"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 4h16v2H2V4zm3 4h10v2H5V8zm-3 4h16v2H2v-2zm3 4h10v2H5v-2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Align Right"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 4h16v2H2V4zm6 4h10v2H8V8zm-6 4h16v2H2v-2zm6 4h10v2H8v-2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Justify"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 4h16v2H2V4zm0 4h16v2H2V8zm0 4h16v2H2v-2zm0 4h16v2H2v-2z" />
          </svg>
        </button>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Text Color */}
        <div className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-gray-200">
          <span className="text-xs text-gray-600 font-medium">Text Color:</span>
          {[
            { color: '#000000', name: 'Black' },
            { color: '#FF0000', name: 'Red' },
            { color: '#0000FF', name: 'Blue' },
            { color: '#00AA00', name: 'Green' },
            { color: '#F59B0F', name: 'Orange' },
            { color: '#9333EA', name: 'Purple' },
          ].map((item) => (
            <button
              key={item.color}
              type="button"
              onClick={() => editor.chain().focus().setColor(item.color).run()}
              className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 hover:scale-110 transition-transform"
              style={{ backgroundColor: item.color }}
              title={item.name}
            />
          ))}
          <div className="relative group">
            <label
              className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center bg-linear-to-br from-red-500 via-yellow-500 to-blue-500 hover:scale-110 transition-transform"
              title="Custom Color"
            >
              <input
                type="color"
                onChange={handleTextColorChange}
                className="absolute opacity-0 w-0 h-0"
              />
              <span className="text-white text-xs font-bold">+</span>
            </label>
          </div>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors text-gray-700 border border-gray-300"
            title="Remove Text Color"
          >
            ✕
          </button>
        </div>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Background Color (Highlight) - Shading */}
        <div className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-gray-200">
          <span className="text-xs text-gray-600 font-medium">Highlight:</span>
          {[
            { color: '#FFFF00', name: 'Yellow' },
            { color: '#FFB6C1', name: 'Pink' },
            { color: '#ADD8E6', name: 'Light Blue' },
            { color: '#90EE90', name: 'Light Green' },
            { color: '#FFD700', name: 'Gold' },
            { color: '#DDA0DD', name: 'Plum' },
          ].map((item) => (
            <button
              key={item.color}
              type="button"
              onClick={() => editor.chain().focus().toggleHighlight({ color: item.color }).run()}
              className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 hover:scale-110 transition-transform"
              style={{ backgroundColor: item.color }}
              title={item.name}
            />
          ))}
          <div className="relative group">
            <label
              className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center bg-linear-to-br from-pink-400 via-purple-400 to-indigo-400 hover:scale-110 transition-transform"
              title="Custom Highlight Color"
            >
              <input
                type="color"
                onChange={handleHighlightColorChange}
                className="absolute opacity-0 w-0 h-0"
              />
              <span className="text-white text-xs font-bold">+</span>
            </label>
          </div>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            className="px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors text-gray-700 border border-gray-300"
            title="Remove Highlight"
          >
            ✕
          </button>
        </div>

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Link */}
        <button
          type="button"
          onClick={addLink}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('link') ? 'bg-[#F59B0F] text-white' : 'text-gray-700'
            }`}
          title="Insert Link"
        >
          <LinkIcon className="w-5 h-5" />
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={removeLink}
            className="px-2 py-1 text-xs rounded hover:bg-red-200 transition-colors text-red-700"
            title="Remove Link"
          >
            Unlink
          </button>
        )}

        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Table Operations */}
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-700"
          title="Insert Table"
        >
          <TableCellsIcon className="w-5 h-5" />
        </button>

        {editor.isActive('table') && (
          <>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              className="px-2 py-1 text-xs rounded hover:bg-gray-200 transition-colors text-gray-700"
              title="Add Column Before"
            >
              Col←
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="px-2 py-1 text-xs rounded hover:bg-gray-200 transition-colors text-gray-700"
              title="Add Column After"
            >
              Col→
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="px-2 py-1 text-xs rounded hover:bg-gray-200 transition-colors text-gray-700"
              title="Delete Column"
            >
              -Col
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              className="px-2 py-1 text-xs rounded hover:bg-gray-200 transition-colors text-gray-700"
              title="Add Row Before"
            >
              Row↑
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="px-2 py-1 text-xs rounded hover:bg-gray-200 transition-colors text-gray-700"
              title="Add Row After"
            >
              Row↓
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="px-2 py-1 text-xs rounded hover:bg-gray-200 transition-colors text-gray-700"
              title="Delete Row"
            >
              -Row
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="px-2 py-1 text-xs rounded hover:bg-red-200 transition-colors text-red-700"
              title="Delete Table"
            >
              🗑️ Table
            </button>

            <div className="w-px bg-gray-300 mx-1 h-6"></div>

            {/* Cell Background Color */}
            <div className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-gray-200">
              <span className="text-xs text-gray-600 font-medium">Cell:</span>
              {[
                { color: '#FFFFFF', name: 'White' },
                { color: '#FFE6E6', name: 'Light Red' },
                { color: '#E6F3FF', name: 'Light Blue' },
                { color: '#E6FFE6', name: 'Light Green' },
                { color: '#FFF9E6', name: 'Light Yellow' },
                { color: '#F3E6FF', name: 'Light Purple' },
              ].map((item) => (
                <button
                  key={item.color}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().setCellAttribute('backgroundColor', item.color).run();
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 hover:scale-110 transition-transform"
                  style={{ backgroundColor: item.color }}
                  title={item.name}
                />
              ))}
              <div className="relative group">
                <label
                  className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center bg-linear-to-br from-orange-400 via-rose-400 to-purple-400 hover:scale-110 transition-transform"
                  title="Custom Cell Color"
                >
                  <input
                    type="color"
                    onChange={handleCellBackgroundChange}
                    className="absolute opacity-0 w-0 h-0"
                  />
                  <span className="text-white text-xs font-bold">+</span>
                </label>
              </div>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setCellAttribute('backgroundColor', null).run();
                }}
                className="px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors text-gray-700 border border-gray-300"
                title="Remove Cell Color"
              >
                ✕
              </button>
            </div>
          </>
        )}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;