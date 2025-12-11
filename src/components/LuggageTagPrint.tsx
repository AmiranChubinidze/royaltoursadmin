import royalGeorgianLogo from "@/assets/royal-georgian-logo.jpg";

export { royalGeorgianLogo };

// CSS styles for luggage tag printing - square format for airport standing display
export const luggageTagPrintStyles = `
  @media print {
    @page {
      size: 120mm 120mm;
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
      width: 120mm !important;
      height: 120mm !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      background: white !important;
      padding: 10mm !important;
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .luggage-tag-print-container img {
      transform: rotate(90deg) !important;
      width: 60mm !important;
      height: auto !important;
      max-height: 50mm !important;
    }
    
    .print\\:hidden {
      display: none !important;
    }
  }
`;
