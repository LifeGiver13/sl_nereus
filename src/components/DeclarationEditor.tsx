import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Bold, List, ListOrdered, Type } from 'lucide-react';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

interface DeclarationEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const DeclarationEditor: React.FC<DeclarationEditorProps> = ({ content, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (prefix: string, suffix: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newContent = 
      content.substring(0, start) + 
      prefix + textToInsert + suffix + 
      content.substring(end);
    
    onChange(newContent);

    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let newContent;
    if (selectedText) {
      // Convert selected lines to bullet list
      const lines = selectedText.split('\n');
      const bulletList = lines.map(line => line.trim() ? `- ${line.trim()}` : '').join('\n');
      newContent = content.substring(0, start) + bulletList + content.substring(end);
    } else {
      // Insert template bullet list
      const bulletList = '- Item 1\n- Item 2\n- Item 3';
      newContent = content.substring(0, start) + bulletList + content.substring(end);
    }
    
    onChange(newContent);
    
    setTimeout(() => {
      textarea.focus();
    }, 0);
  };

  const insertNumberedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let newContent;
    if (selectedText) {
      // Convert selected lines to numbered list
      const lines = selectedText.split('\n');
      const numberedList = lines.map((line, index) => 
        line.trim() ? `${index + 1}. ${line.trim()}` : ''
      ).join('\n');
      newContent = content.substring(0, start) + numberedList + content.substring(end);
    } else {
      // Insert template numbered list
      const numberedList = '1. Item 1\n2. Item 2\n3. Item 3';
      newContent = content.substring(0, start) + numberedList + content.substring(end);
    }
    
    onChange(newContent);
    
    setTimeout(() => {
      textarea.focus();
    }, 0);
  };

  const insertColoredText = () => {
    insertFormatting('<span style="color: #FF0000;">', '</span>', 'colored text');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Content</Label>
        <div className="flex gap-2 mt-2 mb-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => insertFormatting('**', '**', 'bold text')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={insertBulletList}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={insertNumberedList}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={insertColoredText}
            title="Colored Text"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => insertFormatting('[', '](url)', 'link text')}
            title="Link"
          >
            Link
          </Button>
        </div>
        <Textarea
          ref={textareaRef}
          placeholder="Enter your formatted text here. Use the buttons above for formatting."
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
        />
        <div className="text-xs text-muted-foreground mt-2">
          <p>Formatting tips:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>**bold text** for bold</li>
            <li>- Item for bullet lists</li>
            <li>1. Item for numbered lists</li>
            <li>[link text](url) for links</li>
            <li>&lt;span style="color: #FF0000;"&gt;text&lt;/span&gt; for colored text</li>
          </ul>
        </div>
      </div>
      
      <div>
        <Label className="text-xs">Preview</Label>
        <Card className="p-4 mt-2 prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              // Allow HTML in markdown for colored text
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="ml-2">{children}</li>,
              a: ({ href, children }) => (
                <a href={href} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {content || '*No content yet*'}
          </ReactMarkdown>
        </Card>
      </div>
    </div>
  );
};
