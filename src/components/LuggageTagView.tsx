import { useEffect } from "react";
import royalGeorgianLogo from "@/assets/royal-georgian-logo.jpg";
import { Client } from "@/types/confirmation";

const printStyles = `
@media print {
  @page { size: 120mm 120mm; margin: 0; }
  body * { visibility: hidden; }
  #luggage-tag-content, #luggage-tag-content * { visibility: visible; }
  #luggage-tag-content { position: absolute; top: 0; left: 0; width: 120mm !important; height: 120mm !important; }
  .print\\:hidden { display: none !important; }
}
`;

interface LuggageTagViewProps {
  clients: Client[];
  selectedClientIndex: number;
  onClientChange: (index: number) => void;
}

export function LuggageTagView({ clients, selectedClientIndex, onClientChange }: LuggageTagViewProps) {
  const validClients = clients.filter(c => c.name.trim());
  const selectedClient = validClients[selectedClientIndex] || validClients[0];

  // Inject print styles for square 120mm format
  useEffect(() => {
    const styleId = "luggage-tag-print-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = printStyles;
      document.head.appendChild(style);
    }
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
      {validClients.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
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

      <div 
        id="luggage-tag-content"
        className="bg-white rounded-lg shadow-sm border border-border flex flex-col items-center justify-center"
        style={{ 
          width: "120mm", 
          height: "120mm",
          padding: "8mm"
        }}
      >
        <img 
          src={royalGeorgianLogo} 
          alt="Royal Georgian Tours" 
          className="object-contain"
          style={{
            transform: "rotate(90deg)",
            width: "85mm",
            height: "auto",
            maxHeight: "70mm"
          }}
        />
        
        <div 
          className="text-center uppercase leading-tight mt-2"
          style={{ 
            fontFamily: "'Arial Black', 'Helvetica Bold', sans-serif",
            fontSize: "22pt",
            fontWeight: 900,
            color: "#000000",
            letterSpacing: "1px",
            lineHeight: 1.2,
            maxWidth: "105mm",
            wordBreak: "break-word"
          }}
        >
          {selectedClient?.name || ""}
        </div>
      </div>
    </div>
  );
}
