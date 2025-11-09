import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  Quote, 
  Code, 
  Smile,
  Link2
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
  "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
  "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
  "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
  "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗",
  "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😯", "😦", "😧",
  "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢",
  "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "💩", "👻", "💀",
  "☠️", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽"
];

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Start writing...",
  className = ""
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  const getSelectedText = () => {
    if (!textareaRef.current) return "";
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    return value.substring(start, end);
  };

  const replaceSelectedText = (replacement: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = start + replacement.length;
        textareaRef.current.selectionEnd = start + replacement.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const wrapSelectedText = (before: string, after: string = before) => {
    const selectedText = getSelectedText();
    if (selectedText) {
      replaceSelectedText(before + selectedText + after);
    } else {
      // If no text is selected, just insert the formatting
      replaceSelectedText(before + after);
      // Move cursor between the formatting characters
      setTimeout(() => {
        if (textareaRef.current) {
          const start = textareaRef.current.selectionStart;
          textareaRef.current.selectionStart = start - after.length;
          textareaRef.current.selectionEnd = start - after.length;
        }
      }, 0);
    }
  };

  const handleFormat = (format: string) => {
    switch (format) {
      case 'bold':
        wrapSelectedText('**', '**');
        break;
      case 'italic':
        wrapSelectedText('*', '*');
        break;
      case 'underline':
        wrapSelectedText('__', '__');
        break;
      case 'code':
        wrapSelectedText('`', '`');
        break;
      case 'quote':
        wrapSelectedText('> ');
        break;
      case 'list':
        wrapSelectedText('- ');
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          const selectedText = getSelectedText();
          const linkText = selectedText || 'Link';
          wrapSelectedText(`[${linkText}](${url})`);
        }
        break;
    }
  };

  const insertEmoji = (emoji: string) => {
    replaceSelectedText(emoji);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleTextareaSelect = () => {
    if (textareaRef.current) {
      setSelectionStart(textareaRef.current.selectionStart);
      setSelectionEnd(textareaRef.current.selectionEnd);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        onSelect={handleTextareaSelect}
        placeholder={placeholder}
        className="w-full min-h-[200px] p-3 border border-gray-300 dark:border-slate-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-reddit-orange focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
      />
      
      {/* Rich text toolbar */}
      <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
        {/* Text formatting */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleFormat('bold')}
          className="hover:bg-gray-200 dark:hover:bg-slate-600"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleFormat('italic')}
          className="hover:bg-gray-200 dark:hover:bg-slate-600"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleFormat('underline')}
          className="hover:bg-gray-200 dark:hover:bg-slate-600"
        >
          <Underline className="w-4 h-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-4" />
        
        {/* Lists and quotes */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleFormat('list')}
          className="hover:bg-gray-200 dark:hover:bg-slate-600"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleFormat('quote')}
          className="hover:bg-gray-200 dark:hover:bg-slate-600"
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleFormat('code')}
          className="hover:bg-gray-200 dark:hover:bg-slate-600"
        >
          <Code className="w-4 h-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-4" />
        
        {/* Link */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleFormat('link')}
          className="hover:bg-gray-200 dark:hover:bg-slate-600"
        >
          <Link2 className="w-4 h-4" />
        </Button>
        
        {/* Emoji picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="grid grid-cols-10 gap-1">
              {EMOJIS.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => insertEmoji(emoji)}
                  className="w-8 h-8 text-lg hover:bg-gray-100 dark:hover:bg-slate-700 rounded flex items-center justify-center transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
