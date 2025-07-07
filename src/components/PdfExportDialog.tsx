import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PdfExportDialogButton() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        className="px-4 cursor-pointer py-2 rounded-lg bg-green-600 text-white font-bold shadow hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
        onClick={() => setOpen(true)}
      >
        Export as PDF
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton className="bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle>Export Locations as PDF</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-gray-700">
            {/* PDF export options and preview will go here */}
            <div className="text-center text-gray-500">PDF export feature coming soon!</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 