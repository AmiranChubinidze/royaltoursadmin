import { useEffect } from "react";
import royalGeorgianLogo from "@/assets/royal-georgian-logo-new.png";
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
}

export function LuggageTagView({ clients }: LuggageTagViewProps) {
  // Find main guest (the one marked as main) or fallback to first client with a name
  const validClients = clients.filter(c => c.name.trim());
  const mainGuest = validClients.find(c => c.isMainGuest) || validClients[0];

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

  if (!mainGuest) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
        <p className="text-muted-foreground">No main guest selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div
        id="luggage-tag-content"
        className="bg-white rounded-lg shadow-sm border border-border relative overflow-visible"
        style={{ 
          width: "120mm", 
          height: "120mm"
        }}
      >
        <img 
          src={royalGeorgianLogo} 
          alt="Royal Georgian Tours" 
          className="object-contain absolute left-1/2"
          style={{
            transform: "translateX(-50%)",
            width: "60mm",
            height: "auto",
            top: "-10mm"
          }}
        />
        
        <div 
          className="absolute inset-0 flex items-center justify-center"
        >
          <div 
            className="uppercase leading-tight text-center"
            style={{ 
              fontFamily: "'Arial Black', 'Helvetica Bold', sans-serif",
              fontSize: "22pt",
              fontWeight: 900,
              color: "#000000",
              letterSpacing: "1px",
              lineHeight: 1.2,
              maxWidth: "105mm",
              wordBreak: "break-word",
              padding: "0 6mm"
            }}
          >
            {mainGuest.name}
          </div>
        </div>
      </div>
    </div>
  );
}
