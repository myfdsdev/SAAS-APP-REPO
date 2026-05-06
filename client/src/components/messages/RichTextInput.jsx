import React, { useState } from 'react';
import RichTextEditor from './RichTextEditor';

export default function RichTextInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Type a message...",
  companyUsers = [],
  className,
}) {
  const [internalValue, setInternalValue] = useState(value || '');
  const controlled = value !== undefined;
  const editorValue = controlled ? value : internalValue;

  const handleChange = (html) => {
    if (!controlled) setInternalValue(html);
    onChange?.(html);
  };

  const handleSend = (html, attachments, mentions) => {
    onSend?.(html, attachments, mentions);
    if (!controlled) setInternalValue('');
  };

  return (
    <RichTextEditor
      value={editorValue}
      onChange={handleChange}
      onSend={handleSend}
      disabled={disabled}
      placeholder={placeholder}
      companyUsers={companyUsers}
      className={className}
    />
  );
}
