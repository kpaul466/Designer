/**
 * Professional A4 Landscape PDF, SVG, PNG & JSON export utilities
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { BoqItem, DrawingProject, IndexEntry } from '../types/electrical';

/**
 * Export the drawing sheet directly to an official A4 Landscape PDF (297mm x 210mm)
 */
export async function exportToA4Pdf(
  sheetElement: HTMLElement,
  project: DrawingProject,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Preparing high-resolution drawing sheet...');

  // ISO 216 A4 Landscape dimensions in mm
  const a4WidthMm = 297;
  const a4HeightMm = 210;

  try {
    // Render the sheet to high-DPI canvas
    const canvas = await html2canvas(sheetElement, {
      scale: 2.5, // High resolution for crisp line prints
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1600,
    });

    onProgress?.('Generating PDF document...');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [a4WidthMm, a4HeightMm],
      compress: true,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Fit precisely on A4 Landscape sheet with 0 margin because sheetElement has internal engineering border
    pdf.addImage(imgData, 'JPEG', 0, 0, a4WidthMm, a4HeightMm);

    // Document metadata
    pdf.setProperties({
      title: project.metadata.title || project.title,
      subject: `Electrical Distribution Drawing - ${project.metadata.projectName || project.title}`,
      author: project.metadata.preparedBy || 'PowerLine Designer',
      keywords: 'electrical, distribution line, cad, drawing, powerline, boq',
      creator: 'PowerLine Designer Engineering Suite',
    });

    onProgress?.('Saving file...');
    const filename = `${sanitizeFilename(project.metadata.drawingNo || project.title || 'drawing')}_A4.pdf`;
    pdf.save(filename);
    onProgress?.('Complete');
  } catch (err) {
    console.error('PDF export error:', err);
    throw err;
  }
}

/**
 * Export raw SVG string
 */
export function exportToSvg(svgElement: SVGSVGElement, filename: string = 'powerline_drawing.svg'): void {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // Add namespaces if missing
  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.match(/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/)) {
    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  // Add xml declaration
  source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = sanitizeFilename(filename.endsWith('.svg') ? filename : `${filename}.svg`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/**
 * Export to PNG image
 */
export async function exportToPng(element: HTMLElement, filename: string = 'powerline_drawing.png'): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });
  const url = canvas.toDataURL('image/png');
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = sanitizeFilename(filename.endsWith('.png') ? filename : `${filename}.png`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/**
 * Export full project state as JSON file
 */
export function exportToJson(project: DrawingProject): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
  const downloadLink = document.createElement('a');
  downloadLink.href = dataStr;
  downloadLink.download = `${sanitizeFilename(project.metadata.drawingNo || project.title || 'powerline_project')}.json`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'drawing';
}
