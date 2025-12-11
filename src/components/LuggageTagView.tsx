import { useEffect } from "react";
import royalGeorgianLogo from "@/assets/royal-georgian-logo.jpg";
import { Client } from "@/types/confirmation";
import { luggageTagPrintStyles } from "@/components/LuggageTagPrint";

interface LuggageTagViewProps {
  clients: Client[];
  selectedClientIndex: number;
  onClientChange: (index: number) => void;
}

export function LuggageTagView({ clients, selectedClientIndex, onClientChange }: LuggageTagViewProps) {
  const validClients = clients.filter(c => c.name.trim());
  const selectedClient = validClients[selectedClientIndex] || validClients[0];

  // Inject print styles
  useEffect(() => {
    const styleId = "luggage-tag-print-styles";
    let styleEl = document.getElementById(styleId);
    
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = luggageTagPrintStyles;
      document.head.appendChild(styleEl);
    }
    
    return () => {
      // Don't remove on unmount - keep for printing
    };
  }, []);

  if (validClients.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
        <p className="text-muted-foreground">No clients available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Client selector */}
      {validClients.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6 print:hidden">
          {validClients.map((client, index) => (
            <button
              key={index}
              onClick={() => onClientChange(index)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedClientIndex === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              {client.name}
            </button>
          ))}
        </div>
      )}

      {/* Tag preview - SQUARE format for airport standing display */}
      <div 
        className="luggage-tag-print-container bg-white rounded-lg shadow-sm border border-border flex flex-col items-center justify-center"
        style={{ 
          width: "120mm", 
          height: "120mm",
          padding: "10mm"
        }}
      >
        {/* Logo - rotated 90 degrees clockwise to fix orientation */}
        <img 
          src={royalGeorgianLogo} 
          alt="Royal Georgian Tours" 
          className="object-contain mb-4"
          style={{
            transform: "rotate(90deg)",
            width: "60mm",
            height: "auto",
            maxHeight: "50mm"
          }}
        />
        
        {/* Client Name - bold black for airport visibility */}
        <div 
          className="text-center uppercase leading-tight mt-4"
          style={{ 
            fontFamily: "'Arial Black', 'Helvetica Bold', sans-serif",
            fontSize: "24pt",
            fontWeight: 900,
            color: "#000000",
            letterSpacing: "1px",
            lineHeight: 1.2,
            maxWidth: "100mm",
            wordBreak: "break-word"
          }}
        >
          {selectedClient?.name || ""}
        </div>
      </div>
    </div>
  );
}
