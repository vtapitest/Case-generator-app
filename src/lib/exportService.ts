import { Packer, Document, Paragraph, HeadingLevel, TextRun, ImageRun, Footer, AlignmentType, Table, TableRow, TableCell, WidthType, PageNumber } from 'docx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { Case, Finding, Evidence } from '@/types';
import { format } from 'date-fns';
import { decrypt } from './encryption';
import { useAppStore } from '@/store';

export interface ExportOptions {
  summary: boolean;
  findings: boolean;
  evidence: boolean;
}

const isLikelyEncrypted = (text: string | undefined): boolean => {
  return !!text && text.startsWith('U2FsdGVkX1');
}

const handleDecryption = (text: string | undefined, passphrase?: string, fallback = 'No hay datos.') => {
  if (!text) return fallback;
  if (!isLikelyEncrypted(text)) return text;
  if (!passphrase) return "[DATO CIFRADO - Se necesita una passphrase en Ajustes para ver este contenido.]";
  
  const decrypted = decrypt(text, passphrase);
  if (decrypted.startsWith('[Decryption Failed')) {
    return "[ERROR DE DESCIFRADO - La passphrase actual puede ser incorrecta para este dato.]";
  }
  return decrypted;
};

const createStyledParagraph = (text: string, bold = false, size = 22, spacingAfter = 100) =>
  new Paragraph({
    children: [new TextRun({ text, bold, size })],
    spacing: { after: spacingAfter },
  });

const createHeading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1, pageBreakBefore = false) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true })],
    heading: level,
    spacing: { after: 200 },
    pageBreakBefore,
  });

export const exportCaseToDocx = async (caseItem: Case, findings: Finding[], evidenceItems: Evidence[], options: ExportOptions, passphrase?: string) => {
  const logoBase64 = useAppStore.getState().logo;
  const titlePage: Paragraph[] = [];

  if (logoBase64) {
    const imageBuffer = await fetch(logoBase64).then((res) => res.arrayBuffer());
    titlePage.push(new Paragraph({
      children: [new ImageRun({ data: imageBuffer, transformation: { width: 200, height: 100 } } as any)],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }));
  }

  titlePage.push(
    new Paragraph({ children: [new TextRun("Informe de Análisis de Caso")], heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
    new Paragraph({ children: [new TextRun(caseItem.title)], heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 800 } }),
    new Paragraph({ children: [new TextRun(`ID de Reporte: ${caseItem.id}`)], alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun(`Fecha de Generación: ${format(new Date(), 'dd/MM/yyyy')}`)], alignment: AlignmentType.CENTER, spacing: { after: 1200 } }),
    new Paragraph({
      children: [new TextRun({ text: "CONFIDENCIAL", bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({ children: [new TextRun("Este documento contiene información sensible. Su distribución está restringida.")], alignment: AlignmentType.CENTER, pageBreakBefore: true }),
  );

  const content: (Paragraph | Table)[] = [];

  if (options.summary) {
    content.push(
      createHeading('1. Resumen Ejecutivo', HeadingLevel.HEADING_1),
      createStyledParagraph(handleDecryption(caseItem.summaryEnc, passphrase, 'No hay resumen.'), false, 22, 400),
    );
  }

  if (options.findings) {
    content.push(createHeading('2. Hallazgos Relevantes', HeadingLevel.HEADING_1, true));
    for (const finding of findings) {
      content.push(
        createHeading(finding.title, HeadingLevel.HEADING_2),
        createStyledParagraph(`Severidad: ${finding.severity} | Estado: ${finding.status}`),
        createStyledParagraph(handleDecryption(finding.descriptionEnc, passphrase, 'Sin descripción.'), false, 22, 200),
      );
    }
  }
  
  if (options.evidence) {
    content.push(createHeading('3. Evidencias Analizadas', HeadingLevel.HEADING_1, true));
    for (const evidence of evidenceItems) {
      content.push(
        createHeading(evidence.title, HeadingLevel.HEADING_2),
        createStyledParagraph(`Tipo: ${evidence.type} | Veredicto: ${evidence.verdict}`),
        createStyledParagraph(`Fecha de Observación: ${format(evidence.observationTs, 'dd/MM/yyyy HH:mm')}`),
        createStyledParagraph(`Contenido:`, true),
        new Paragraph({ children: [new TextRun(evidence.content)], style: "Well Spaced" }),
      );

      if (evidence.files && evidence.files.length > 0) {
        content.push(createStyledParagraph('Archivos Adjuntos:', true, 22, 200));
        for (const file of evidence.files) {
          if (file.mime.startsWith('image/')) {
            try {
              const imageBuffer = await fetch(file.content).then((res) => res.arrayBuffer());
              content.push(new Paragraph({
                children: [new ImageRun({ data: imageBuffer, transformation: { width: 450, height: 300 } } as any)],
                spacing: { after: 200 },
              }));
            } catch (e) { content.push(createStyledParagraph(`[Error al procesar imagen: ${file.name}]`)); }
          } else {
            const createTableCell = (text: string) => new TableCell({ children: [new Paragraph({ children: [new TextRun(text)] })] });
            const createHeaderCell = (text: string) => new TableCell({ children: [new Paragraph({ children: [new TextRun(text)] })], shading: { fill: "E5E7EB" } });
            
            const table = new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: [createHeaderCell("Nombre"), createTableCell(file.name)] }),
                new TableRow({ children: [createHeaderCell("Tamaño"), createTableCell(`${Math.round(file.size / 1024)} KB`)] }),
                new TableRow({ children: [createHeaderCell("Tipo MIME"), createTableCell(file.mime)] }),
                new TableRow({ children: [createHeaderCell("SHA256"), createTableCell(file.sha256)] }),
              ],
            });
            content.push(table);
            content.push(new Paragraph({ spacing: { after: 200 } }));
          }
        }
      }
    }
  }

  const doc = new Document({
    styles: { paragraphStyles: [{ id: "Well Spaced", name: "Well Spaced", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 20, font: "Courier New" }, paragraph: { spacing: { line: 276, after: 200 } } }] },
    sections: [{
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun("CONFIDENCIAL | Guillermon Software © | Página "),
              new TextRun({ children: [PageNumber.CURRENT] }),
            ],
          })],
        }),
      },
      children: [...titlePage, ...content],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Caso_${caseItem.title.replace(/\s/g, '_')}.docx`);
};

export const exportCaseToPdf = (caseItem: Case, findings: Finding[], evidenceItems: Evidence[], options: ExportOptions, passphrase?: string) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const maxWidth = doc.internal.pageSize.width - margin * 2;
  let y = 0;
  const logoBase64 = useAppStore.getState().logo;

  const addFooter = () => {
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(128);
      const text = `CONFIDENCIAL | Guillermon Software © | Página ${i} de ${pageCount}`;
      const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
      doc.text(text, (doc.internal.pageSize.width - textWidth) / 2, pageHeight - 10);
    }
  };

  // --- Portada ---
  y = 40;
  if (logoBase64) {
    try {
      const imgProps = doc.getImageProperties(logoBase64);
      const aspectRatio = imgProps.width / imgProps.height;
      const logoWidth = 60;
      const logoHeight = logoWidth / aspectRatio;
      doc.addImage(logoBase64, imgProps.fileType.toUpperCase(), (doc.internal.pageSize.width - logoWidth) / 2, y, logoWidth, logoHeight);
      y += logoHeight + 10;
    } catch (e) { console.error("Error adding logo to PDF:", e); }
  }

  doc.setFontSize(24);
  doc.text("Informe de Análisis de Caso", doc.internal.pageSize.width / 2, y, { align: 'center' }); y += 20;
  doc.setFontSize(18);
  doc.text(caseItem.title, doc.internal.pageSize.width / 2, y, { align: 'center' }); y += 30;
  doc.setFontSize(12);
  doc.text(`ID de Reporte: ${caseItem.id}`, doc.internal.pageSize.width / 2, y, { align: 'center' }); y += 10;
  doc.text(`Fecha de Generación: ${format(new Date(), 'dd/MM/yyyy')}`, doc.internal.pageSize.width / 2, y, { align: 'center' }); y += 30;
  doc.setFontSize(14);
  doc.setTextColor(255, 0, 0);
  doc.text("CONFIDENCIAL", doc.internal.pageSize.width / 2, y, { align: 'center' }); y += 10;
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text("Este documento contiene información sensible. Su distribución está restringida.", doc.internal.pageSize.width / 2, y, { align: 'center' });

  doc.addPage();
  y = margin;

  const checkPageBreak = (heightNeeded: number) => {
    if (y + heightNeeded > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // --- Contenido ---
  if (options.summary) {
    doc.setFontSize(16);
    doc.text('1. Resumen Ejecutivo', margin, y); y += 10;
    doc.setFontSize(11);
    const summaryText = handleDecryption(caseItem.summaryEnc, passphrase, 'No hay resumen.');
    const summaryLines = doc.splitTextToSize(summaryText, maxWidth);
    checkPageBreak(summaryLines.length * 5);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 10;
  }

  if (options.findings) {
    checkPageBreak(20);
    doc.setFontSize(16);
    doc.text('2. Hallazgos Relevantes', margin, y); y += 10;
    findings.forEach(finding => {
      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(finding.title, margin, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Severidad: ${finding.severity} | Estado: ${finding.status}`, margin, y); y += 7;
      const descText = handleDecryption(finding.descriptionEnc, passphrase, 'Sin descripción.');
      const descLines = doc.splitTextToSize(descText, maxWidth);
      checkPageBreak(descLines.length * 5 + 5);
      doc.text(descLines, margin, y);
      y += descLines.length * 5 + 5;
    });
  }

  if (options.evidence) {
    checkPageBreak(20);
    doc.setFontSize(16);
    doc.text('3. Evidencias Analizadas', margin, y); y += 10;
    evidenceItems.forEach(evidence => {
      checkPageBreak(45);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(evidence.title, margin, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Tipo: ${evidence.type} | Veredicto: ${evidence.verdict}`, margin, y); y += 7;
      doc.text(`Fecha de Observación: ${format(evidence.observationTs, 'dd/MM/yyyy HH:mm')}`, margin, y); y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Contenido:', margin, y); y += 7;
      doc.setFont('helvetica', 'normal');
      const contentLines = doc.splitTextToSize(evidence.content, maxWidth);
      checkPageBreak(contentLines.length * 5);
      doc.text(contentLines, margin, y);
      y += contentLines.length * 5 + 5;

      if (evidence.files && evidence.files.length > 0) {
        checkPageBreak(10);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Archivos Adjuntos:', margin, y); y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
  
        evidence.files.forEach(file => {
          if (file.mime.startsWith('image/')) {
            try {
              const imgProps = doc.getImageProperties(file.content);
              const aspectRatio = imgProps.width / imgProps.height;
              let displayWidth = maxWidth * 0.75;
              if (imgProps.width < displayWidth) displayWidth = imgProps.width;
              let displayHeight = displayWidth / aspectRatio;
              checkPageBreak(displayHeight + 10);
              doc.addImage(file.content, imgProps.fileType.toUpperCase(), margin, y, displayWidth, displayHeight);
              y += displayHeight + 5;
            } catch (e) {
              checkPageBreak(10);
              doc.text(`[Error al procesar imagen: ${file.name}]`, margin, y); y += 7;
            }
          } else {
            checkPageBreak(25);
            doc.text(`- Nombre: ${file.name}`, margin, y); y += 6;
            doc.text(`  Tamaño: ${Math.round(file.size / 1024)} KB`, margin + 5, y); y += 6;
            doc.text(`  Tipo: ${file.mime}`, margin + 5, y); y += 6;
            doc.text(`  SHA256: ${file.sha256}`, margin + 5, y); y += 8;
          }
        });
      }
    });
  }

  addFooter();
  doc.save(`Caso_${caseItem.title.replace(/\s/g, '_')}.pdf`);
};