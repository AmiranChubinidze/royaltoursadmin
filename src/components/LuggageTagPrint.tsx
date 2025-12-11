import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import luggageTagTemplate from "@/assets/luggage-tag-template.png";

interface LuggageTagPrintProps {
  clientName: string;
  onClose: () => void;
}

export function LuggageTagPrint({ clientName, onClose }: LuggageTagPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Luggage Tag - ${clientName}</title>
          <style>
            @page {
              size: 210mm 297mm;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: white;
            }
            .tag-container {
              width: 80mm;
              height: 120mm;
              position: relative;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .tag-image {
              width: 100%;
              max-height: 90mm;
              object-fit: contain;
            }
            .tag-name {
              margin-top: 8mm;
              font-size: 14pt;
              font-weight: bold;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.5mm;
              color: #1a1a1a;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="tag-container">
            <img src="${luggageTagTemplate}" class="tag-image" />
            <div class="tag-name">${clientName}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Wait for image to load before printing
    const img = printWindow.document.querySelector('img');
    if (img) {
      img.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    } else {
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg border border-border max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Luggage Tag Preview</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Preview */}
        <div 
          ref={printRef}
          className="bg-white rounded-lg p-6 mb-4 flex flex-col items-center justify-center border border-border"
        >
          <img 
            src={luggageTagTemplate} 
            alt="Luggage tag" 
            className="max-w-[200px] h-auto object-contain"
          />
          <p className="mt-4 text-lg font-bold text-center uppercase tracking-wide text-[#1a1a1a]">
            {clientName}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print Tag
          </Button>
        </div>
      </div>
    </div>
  );
}
