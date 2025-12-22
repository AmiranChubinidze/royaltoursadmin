import { useEffect } from "react";
import royalGeorgianLogo from "@/assets/royal-georgian-logo-new.png";
import { Client } from "@/types/confirmation";

const PRINT_STYLE_ID = "luggage-tag-print-styles";
const PRINT_BODY_CLASS = "printing-luggage-tag";

const printStyles = `
@media print {
  @page { 
    size: A4 portrait; 
    margin: 0 !important; 
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 210mm !important;
    height: 297mm !important;
    overflow: hidden !important;
    background: #fff !important;
  }

  body.${PRINT_BODY_CLASS},
  body.${PRINT_BODY_CLASS} > *,
  body.${PRINT_BODY_CLASS} .container { 
    visibility: hidden !important;
    overflow: hidden !important;
    height: auto !important;
    max-height: 297mm !important;
  }
  
  body.${PRINT_BODY_CLASS} #luggage-tag-content,
  body.${PRINT_BODY_CLASS} #luggage-tag-content * { 
    visibility: visible !important; 
  }

  body.${PRINT_BODY_CLASS} #luggage-tag-content {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    width: 180mm !important;
    height: 180mm !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: translate(-50%, -50%) rotate(90deg) !important;
    transform-origin: center center !important;
    background: #fff !important;
    overflow: visible !important;
  }

  body.${PRINT_BODY_CLASS} #luggage-tag-content img {
    width: 120mm !important;
    height: auto !important;
    top: -15mm !important;
  }

  body.${PRINT_BODY_CLASS} #luggage-tag-content .guest-name-print {
    font-size: 32pt !important;
    white-space: nowrap !important;
    max-width: none !important;
  }

  body.${PRINT_BODY_CLASS} .print\\:hidden,
  body.${PRINT_BODY_CLASS} .confirmation-letter-wrapper > *:not(#luggage-tag-content) { 
    display: none !important; 
  }
}
`;

function removeLuggageTagPrintStyles() {
  document
    .querySelectorAll(`style#${PRINT_STYLE_ID}`)
    .forEach((el) => el.remove());
}

interface LuggageTagViewProps {
  clients: Client[];
}

export function LuggageTagView({ clients }: LuggageTagViewProps) {
  // Find main guest (the one marked as main) or fallback to first client with a name
  const validClients = clients.filter((c) => c.name.trim());
  const mainGuest = validClients.find((c) => c.isMainGuest) || validClients[0];

  // Inject print styles for square 120mm format, scoped by a body class
  useEffect(() => {
    // Defensive cleanup in case older versions left styles behind
    removeLuggageTagPrintStyles();

    const style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    style.textContent = printStyles;
    document.head.appendChild(style);

    const handleBeforePrint = () => document.body.classList.add(PRINT_BODY_CLASS);
    const handleAfterPrint = () => document.body.classList.remove(PRINT_BODY_CLASS);

    // Keep class on while mounted (so printing works even if beforeprint doesn't fire early enough)
    document.body.classList.add(PRINT_BODY_CLASS);

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove(PRINT_BODY_CLASS);
      removeLuggageTagPrintStyles();
    };
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
        className="bg-white relative overflow-hidden"
        style={{
          width: "120mm",
          height: "120mm",
          borderRadius: 0,
        }}
      >
        <img
          src={royalGeorgianLogo}
          alt="Royal Georgian Tours"
          className="object-contain absolute left-1/2"
          style={{
            transform: "translateX(-50%)",
            width: "80mm",
            height: "auto",
            top: "-10mm",
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="uppercase leading-tight text-center guest-name-print"
            style={{
              fontFamily: "'Arial Black', 'Helvetica Bold', sans-serif",
              fontSize: "22pt",
              fontWeight: 900,
              color: "#000000",
              letterSpacing: "1px",
              lineHeight: 1.2,
              maxWidth: "105mm",
              wordBreak: "break-word",
              padding: "0 6mm",
            }}
          >
            {mainGuest.name}
          </div>
        </div>
      </div>
    </div>
  );
}
