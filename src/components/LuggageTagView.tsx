import luggageTagTemplate from "@/assets/luggage-tag-template.jpg";
import { Client } from "@/types/confirmation";

interface LuggageTagViewProps {
  clients: Client[];
  selectedClientIndex: number;
  onClientChange: (index: number) => void;
}

export function LuggageTagView({ clients, selectedClientIndex, onClientChange }: LuggageTagViewProps) {
  const validClients = clients.filter(c => c.name.trim());
  const selectedClient = validClients[selectedClientIndex] || validClients[0];

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
        <div className="flex flex-wrap gap-2 mb-4 print:hidden">
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

      {/* Tag preview */}
      <div className="relative inline-block bg-white rounded-lg shadow-sm border border-border p-4">
        <img 
          src={luggageTagTemplate} 
          alt="Luggage tag" 
          className="max-w-full max-h-[70vh] w-auto h-auto"
        />
        {/* Name overlay - positioned to match original template text location */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ top: "60%", transform: "translateY(-50%)" }}
        >
          <div 
            className="text-center uppercase leading-tight"
            style={{ 
              fontFamily: "'Arial Black', 'Helvetica Bold', sans-serif",
              fontSize: "clamp(16px, 4vw, 32px)",
              fontWeight: 900,
              color: "#1a1a1a",
              letterSpacing: "2px",
              lineHeight: 1.2,
              maxWidth: "80%",
              wordBreak: "break-word"
            }}
          >
            {selectedClient?.name || ""}
          </div>
        </div>
      </div>
    </div>
  );
}
