import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function NotesPopup({ open, onClose, notes = '', onSave }) {
  const [notesValue, setNotesValue] = useState(notes);

  useEffect(() => {
    setNotesValue(notes);
  }, [notes, open]);

  const handleSave = () => {
    onSave(notesValue);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Notes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your notes here..."
            className="min-h-[200px] resize-y text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              Save Notes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}