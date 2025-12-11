import royalGeorgianLogo from "@/assets/royal-georgian-logo.jpg";

export { royalGeorgianLogo };

// CSS styles for luggage tag printing - injected into document for in-page printing
export const luggageTagPrintStyles = `
  @media print {
    @page {
      size: 100mm 150mm;
      margin: 0;
    }
    
    body * {
      visibility: hidden;
    }
    
    .luggage-tag-print-container,
    .luggage-tag-print-container * {
      visibility: visible;
    }
    
    .luggage-tag-print-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100mm;
      height: 150mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: white;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .print\\:hidden {
      display: none !important;
    }
  }
`;
