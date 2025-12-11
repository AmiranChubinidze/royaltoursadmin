import luggageTagTemplate from "@/assets/luggage-tag-template.png";

interface LuggageTagPrintProps {
  clientNames: string[];
  onComplete: () => void;
}

export function printLuggageTags(clientNames: string[]) {
  if (clientNames.length === 0) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const pages = clientNames.map(name => `
    <div class="tag-page">
      <div class="tag-container">
        <img src="${luggageTagTemplate}" class="tag-image" />
        <div class="tag-name">${name.toUpperCase()}</div>
      </div>
    </div>
  `).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Luggage Tags</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Arial Black', 'Arial', sans-serif;
            background: white;
          }
          .tag-page {
            width: 100%;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            page-break-after: always;
          }
          .tag-page:last-child {
            page-break-after: auto;
          }
          .tag-container {
            position: relative;
            display: inline-block;
          }
          .tag-image {
            max-width: 180mm;
            max-height: 250mm;
            width: auto;
            height: auto;
          }
          .tag-name {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 28pt;
            font-weight: 900;
            text-align: center;
            color: #000;
            white-space: nowrap;
            letter-spacing: 1px;
            text-shadow: 
              1px 1px 0 #fff,
              -1px -1px 0 #fff,
              1px -1px 0 #fff,
              -1px 1px 0 #fff;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .tag-page {
              height: auto;
              min-height: 100vh;
            }
          }
        </style>
      </head>
      <body>
        ${pages}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  // Wait for images to load before printing
  const images = printWindow.document.querySelectorAll('img');
  let loadedCount = 0;
  
  const checkAndPrint = () => {
    loadedCount++;
    if (loadedCount >= images.length) {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 100);
    }
  };

  if (images.length === 0) {
    printWindow.print();
    printWindow.close();
  } else {
    images.forEach(img => {
      if (img.complete) {
        checkAndPrint();
      } else {
        img.onload = checkAndPrint;
        img.onerror = checkAndPrint;
      }
    });
  }
}
