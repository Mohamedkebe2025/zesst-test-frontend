'use client';

import React, { useCallback, useMemo } from 'react';
import { createEditor, Descendant, Element as SlateElement, Editor, Transforms, BaseEditor } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps, ReactEditor } from 'slate-react';
import { withHistory, HistoryEditor } from 'slate-history';
import { Button, Tooltip } from 'antd';
import {
    BoldOutlined,
    ItalicOutlined,
    UnderlineOutlined,
    OrderedListOutlined,
    UnorderedListOutlined,
    AlignLeftOutlined,
    AlignCenterOutlined,
    AlignRightOutlined,
    CodeOutlined,
    LinkOutlined,
    PictureOutlined,
    FontSizeOutlined
} from '@ant-design/icons';

// Define custom element types
type CustomElement = {
    type: 'paragraph' | 'heading-one' | 'heading-two' | 'heading-three' | 'block-quote' | 'numbered-list' | 'bulleted-list' | 'list-item' | 'image' | 'code-block';
    children: CustomText[];
    url?: string;
    alt?: string;
};

// Define custom text types
type CustomText = {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    code?: boolean;
};

// Declare type for the Slate editor
declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor & HistoryEditor;
        Element: CustomElement;
        Text: CustomText;
    }
}

interface BlockEditorProps {
    initialValue: Descendant[];
    onChange: (value: Descendant[]) => void;
    readOnly?: boolean;
}

const BlockEditor: React.FC<BlockEditorProps> = ({ initialValue, onChange, readOnly = false }) => {
    // Create a Slate editor object that won't change across renders
    const editor = useMemo(() => withHistory(withReact(createEditor())), []);

    // Define a rendering function for elements
    const renderElement = useCallback((props: RenderElementProps) => {
        const { attributes, children, element } = props;

        switch (element.type) {
            case 'heading-one':
                return <h1 {...attributes} className="text-3xl font-bold my-4">{children}</h1>;
            case 'heading-two':
                return <h2 {...attributes} className="text-2xl font-bold my-3">{children}</h2>;
            case 'heading-three':
                return <h3 {...attributes} className="text-xl font-bold my-2">{children}</h3>;
            case 'block-quote':
                return <blockquote {...attributes} className="border-l-4 border-gray-300 pl-4 italic my-4">{children}</blockquote>;
            case 'numbered-list':
                return <ol {...attributes} className="list-decimal ml-6 my-4">{children}</ol>;
            case 'bulleted-list':
                return <ul {...attributes} className="list-disc ml-6 my-4">{children}</ul>;
            case 'list-item':
                return <li {...attributes}>{children}</li>;
            case 'code-block':
                return (
                    <pre {...attributes} className="bg-gray-100 p-4 rounded my-4 font-mono">
                        <code>{children}</code>
                    </pre>
                );
            case 'image':
                return (
                    <div {...attributes} contentEditable={false} className="my-4">
                        <img src={element.url} alt={element.alt || ''} className="max-w-full h-auto" />
                        {children}
                    </div>
                );
            default:
                return <p {...attributes} className="my-2">{children}</p>;
        }
    }, []);

    // Define a rendering function for leaf nodes (text formatting)
    const renderLeaf = useCallback((props: RenderLeafProps) => {
        const { attributes, children, leaf } = props;
        let formattedChildren = children;

        if (leaf.bold) {
            formattedChildren = <strong>{formattedChildren}</strong>;
        }

        if (leaf.italic) {
            formattedChildren = <em>{formattedChildren}</em>;
        }

        if (leaf.underline) {
            formattedChildren = <u>{formattedChildren}</u>;
        }

        if (leaf.code) {
            formattedChildren = <code className="bg-gray-100 px-1 rounded font-mono">{formattedChildren}</code>;
        }

        return <span {...attributes}>{formattedChildren}</span>;
    }, []);

    // Define toolbar button handlers
    const toggleMark = (format: keyof Omit<CustomText, 'text'>) => {
        const isActive = isMarkActive(editor, format);
        if (isActive) {
            Editor.removeMark(editor, format);
        } else {
            Editor.addMark(editor, format, true);
        }
    };

    const toggleBlock = (format: CustomElement['type']) => {
        const isActive = isBlockActive(editor, format);
        const isList = format === 'numbered-list' || format === 'bulleted-list';

        Transforms.unwrapNodes(editor, {
            match: n =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                (n.type === 'numbered-list' || n.type === 'bulleted-list'),
            split: true,
        });

        const newProperties: Partial<SlateElement> = {
            type: isActive ? 'paragraph' : isList ? 'list-item' : format,
        };

        Transforms.setNodes(editor, newProperties);

        if (!isActive && isList) {
            const block = { type: format, children: [] };
            Transforms.wrapNodes(editor, block);
        }
    };

    // Helper functions to check active state
    const isMarkActive = (editor: Editor, format: keyof Omit<CustomText, 'text'>) => {
        const marks = Editor.marks(editor);
        return marks ? marks[format] === true : false;
    };

    const isBlockActive = (editor: Editor, format: CustomElement['type']) => {
        const [match] = Editor.nodes(editor, {
            match: n =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                n.type === format,
        });
        return !!match;
    };

    // Render the editor
    return (
        <div className="border rounded-md">
            <Slate editor={editor} initialValue={initialValue} onChange={onChange}>
                {!readOnly && (
                    <div className="flex flex-wrap gap-1 p-2 border-b">
                        <Tooltip title="Bold">
                            <Button
                                icon={<BoldOutlined />}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    toggleMark('bold');
                                }}
                                type={isMarkActive(editor, 'bold') ? 'primary' : 'default'}
                            />
                        </Tooltip>
                        <Tooltip title="Italic">
                            <Button
                                icon={<ItalicOutlined />}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    toggleMark('italic');
                                }}
                                type={isMarkActive(editor, 'italic') ? 'primary' : 'default'}
                            />
                        </Tooltip>
                        <Tooltip title="Underline">
                            <Button
                                icon={<UnderlineOutlined />}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    toggleMark('underline');
                                }}
                                type={isMarkActive(editor, 'underline') ? 'primary' : 'default'}
                            />
                        </Tooltip>
                        <Tooltip title="Code">
                            <Button
                                icon={<CodeOutlined />}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    toggleMark('code');
                                }}
                                type={isMarkActive(editor, 'code') ? 'primary' : 'default'}
                            />
                        </Tooltip>
                        <div className="border-r mx-1 h-6"></div>
                        <Tooltip title="Heading 1">
                            <Button
                                icon={<FontSizeOutlined />}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    toggleBlock('heading-one');
                                }}
                                type={isBlockActive(editor, 'heading-one') ? 'primary' : 'default'}
                            >
                                H1
                            </Button>
                        </Tooltip>
                        <Tooltip title="Heading 2">
                            <Button
                                icon={<FontSizeOutlined />}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    toggleBlock('heading-two');
                                }}
                                type={isBlockActive(editor, 'heading-two') ? 'primary' : 'default'}
                            >
                                H2
                            </Button>
                        </Tooltip>
                        <Tooltip title="Heading 3">
                            <Button
                                icon={<FontSizeOutlined />}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    toggleBlock('heading-three');
                                }}
                                type={isBlockActive(editor, 'heading-three') ? 'primary' : 'default'}
                            >
                                H3
                            </Button>
                        </Tooltip>
                        <div className="border-r mx-1 h-6"></div>
                        <Tooltip title="Bulleted List">
                            <Button
                                icon={<UnorderedListOutlined />}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    toggleBlock('bulleted-list');
                                }}
                                type={isBlockActive(editor, 'bulleted-list') ? 'primary' : 'default'}
                            />
                        </Tooltip>
                        <Tooltip title="Numbered List">
                            <Button
                                icon={<OrderedListOutlined />}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    toggleBlock('numbered-list');
                                }}
                                type={isBlockActive(editor, 'numbered-list') ? 'primary' : 'default'}
                            />
                        </Tooltip>
                        <Tooltip title="Quote">
                            <Button
                                icon={<AlignLeftOutlined />}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    toggleBlock('block-quote');
                                }}
                                type={isBlockActive(editor, 'block-quote') ? 'primary' : 'default'}
                            />
                        </Tooltip>
                        <Tooltip title="Code Block">
                            <Button
                                icon={<CodeOutlined />}
                                onMouseDown={e => {
                                    e.preventDefault();
                                    toggleBlock('code-block');
                                }}
                                type={isBlockActive(editor, 'code-block') ? 'primary' : 'default'}
                            />
                        </Tooltip>
                    </div>
                )}
                <div className="p-4 min-h-[500px]">
                    <Editable
                        renderElement={renderElement}
                        renderLeaf={renderLeaf}
                        placeholder="Enter document content here..."
                        spellCheck
                        autoFocus
                        readOnly={readOnly}
                        className="outline-none min-h-[500px]"
                    />
                </div>
            </Slate>
        </div>
    );
};

export default BlockEditor;