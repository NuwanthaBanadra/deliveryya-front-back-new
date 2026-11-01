import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import {
    BoldIcon,
    ItalicIcon,
    ListBulletIcon,
} from '@heroicons/react/24/outline';

interface PlainHtmlEditorProps {
    content: string;
    onChange: (html: string) => void;
    minHeightClassName?: string;
}

function PlainHtmlEditor({
    content,
    onChange,
    minHeightClassName = 'min-h-32',
}: PlainHtmlEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                codeBlock: false,
                blockquote: false,
                horizontalRule: false,
            }),
            Underline,
        ],
        content,
        onUpdate: ({ editor: currentEditor }) => {
            onChange(currentEditor.getHTML());
        },
        editorProps: {
            attributes: {
                class: `prose prose-sm max-w-none focus:outline-none px-4 py-3 text-sm text-gray-700 ${minHeightClassName}`,
            },
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        if (editor && editor.getHTML() !== content) {
            editor.commands.setContent(content, { emitUpdate: false });
        }
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    const toolButtonClass = (isActive: boolean) => (
        `inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
            isActive
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-600'
        }`
    );

    return (
        <div className="rounded-xl border-2 border-gray-200 bg-white focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-100 transition-all overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={toolButtonClass(editor.isActive('bold'))}
                    aria-label="Bold"
                    title="Bold"
                >
                    <BoldIcon className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={toolButtonClass(editor.isActive('italic'))}
                    aria-label="Italic"
                    title="Italic"
                >
                    <ItalicIcon className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={toolButtonClass(editor.isActive('underline'))}
                    aria-label="Underline"
                    title="Underline"
                >
                    <span className="text-sm font-bold underline">U</span>
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={toolButtonClass(editor.isActive('bulletList'))}
                    aria-label="Bullet list"
                    title="Bullet list"
                >
                    <ListBulletIcon className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={toolButtonClass(editor.isActive('orderedList'))}
                    aria-label="Ordered list"
                    title="Ordered list"
                >
                    <span className="text-xs font-bold">1.</span>
                </button>
                <div className="mx-1 h-6 w-px bg-gray-200" />
                <button
                    type="button"
                    onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-amber-300 hover:text-amber-600 transition-colors"
                >
                    Clear
                </button>
            </div>

            <EditorContent editor={editor} />
        </div>
    );
}

export default PlainHtmlEditor;