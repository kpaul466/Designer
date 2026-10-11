/**
 * A4 Landscape PDF & CAD Export Modal
 * True ISO 216 A4 Landscape (297mm x 210mm) engineering layout preview & generator
 * Resolves top & bottom info duplication:
 * - Top Header: State Electricity Utility Authority, Sub-Division, Scheme, and 33/11kV Feeder Corridor
 * - Bottom Title Block: Turnkey Contractor, Applicant Details, Drawing No., Revision, and 3-tier Engineering Sign-Off Grid
 */

import React, { useEffect, useRef, useState } from 'react';
import { DrawingProject, MapFeatureSelection } from '../../types/electrical';
import { calculateBoq, generateIndexEntries } from '../../utils/boqCalculator';
import { exportToA4Pdf, exportToJson, exportToPng, exportToSvg } from '../../utils/pdfExport';
import { Check, Download, FileCode, FileText, Image, Printer, Settings2, X, Zap } from 'lucide-react';
import { ConductorRenderer } from '../Canvas/ConductorRenderer';
import { CrossingRenderer } from '../Canvas/CrossingRenderer';
import { NodeRenderer } from '../Canvas/NodeRenderer';
import { StayRenderer } from '../Canvas/StayRenderer';
import { MapUnderlay } from '../Canvas/MapUnderlay';
import { getCanvasBoundsForPageSize } from '../../constants/pageSizes';

interface ExportModalProps {
  isOpen: boolean;
  openSettings: boolean;
  project: DrawingProject;
  mapFeatures: MapFeatureSelection;
  showMap: boolean;
  mapOpacity: number;
  mapLayerPosition: 'underlay' | 'overlay';
  onMapVisibilityChange: (visible: boolean) => void;
  onClose: () => void;
}

const PDF_ATTRIBUTES = [
  { key: 'title', label: 'Drawing title' },
  { key: 'projectName', label: 'Project name' },
  { key: 'drawingNo', label: 'Drawing number' },
  { key: 'applicationNo', label: 'Application number' },
  { key: 'poNumber', label: 'PO number' },
  { key: 'workOrderNo', label: 'Work order number' },
  { key: 'agencyName', label: 'Agency name' },
  { key: 'subDivision', label: 'Sub-division' },
  { key: 'cccName', label: 'CCC name' },
  { key: 'divisionName', label: 'Division name' },
  { key: 'location', label: 'Location' },
  { key: 'coordinates', label: 'Coordinates' },
  { key: 'date', label: 'Working date' },
  { key: 'scale', label: 'Scale' },
  { key: 'revision', label: 'Revision' },
  { key: 'applicantName', label: 'Applicant name' },
  { key: 'applicantPhone', label: 'Applicant phone' },
  { key: 'applicantAddress', label: 'Applicant address' },
  { key: 'preparedBy', label: 'Prepared by' },
  { key: 'preparedByOffice', label: 'Prepared by office' },
  { key: 'checkedBy', label: 'Checked by' },
  { key: 'checkedByOffice', label: 'Checked by office' },
  { key: 'approvedBy', label: 'Approved by' },
  { key: 'approvedByOffice', label: 'Approved by office' },
] as const;

type PdfAttributeKey = (typeof PDF_ATTRIBUTES)[number]['key'];

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  openSettings,
  project,
  mapFeatures,
  showMap,
  mapOpacity,
  mapLayerPosition,
  onMapVisibilityChange,
  onClose,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [previewScale, setPreviewScale] = useState(0.5);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showPdfSettings, setShowPdfSettings] = useState(false);
  const [designView, setDesignView] = useState<'engineering' | 'drawing'>('engineering');
  const [selectedAttributes, setSelectedAttributes] = useState<PdfAttributeKey[]>(
    PDF_ATTRIBUTES.map(({ key }) => key)
  );
  const [includeDrawingIndex, setIncludeDrawingIndex] = useState(true);
  const [includeBoq, setIncludeBoq] = useState(true);
  const [includeTitleBlock, setIncludeTitleBlock] = useState(true);

  useEffect(() => {
    if (isOpen && openSettings) setShowPdfSettings(true);
  }, [isOpen, openSettings]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const updateScale = () => {
      const availableWidth = preview.clientWidth - 32;
      const availableHeight = preview.clientHeight - 32;
      setPreviewScale(Math.max(0.1, Math.min(1, availableWidth / 1050, availableHeight / 742)));
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(preview);
    updateScale();
    return () => observer.disconnect();
  }, [isOpen, showPdfSettings]);

  if (!isOpen) return null;

  const boqItems = calculateBoq(
    project.nodes,
    project.edges,
    project.stays,
    project.customBoqOverrides
  );

  const indexEntries = generateIndexEntries(
    project.nodes,
    project.edges,
    project.stays
  );
  const metadata = project.metadata;
  const nonEmpty = (value?: string) => {
    const cleanValue = value?.trim() || '';
    if (/^enter\b/i.test(cleanValue) || cleanValue === 'Surveyor Name' || cleanValue === '9800000000') {
      return '';
    }
    return cleanValue;
  };
  const isAttributeSelected = (key: PdfAttributeKey) => selectedAttributes.includes(key);
  const fieldRows = (...fields: Array<[string, string | undefined, PdfAttributeKey]>): Array<[string, string]> =>
    fields.flatMap(([label, value, key]) => {
      const cleanValue = nonEmpty(value);
      return cleanValue && isAttributeSelected(key) ? [[label, cleanValue]] : [];
    });
  const applicantDetails = fieldRows(
    ['APPLICANT', metadata.applicantName, 'applicantName'],
    ['PHONE', metadata.applicantPhone, 'applicantPhone'],
    ['ADDRESS', metadata.applicantAddress, 'applicantAddress']
  );
  const referenceDetails = fieldRows(
    ['APPLICATION NO', metadata.applicationNo, 'applicationNo'],
    ['PO NUMBER', metadata.poNumber, 'poNumber'],
    ['WORK ORDER NO', metadata.workOrderNo, 'workOrderNo'],
    ['SUB-DIVISION', metadata.subDivision, 'subDivision'],
    ['CCC', metadata.cccName, 'cccName'],
    ['DIVISION', metadata.divisionName, 'divisionName']
  );
  const signOffs = [
    {
      label: 'PREPARED BY',
      designation: isAttributeSelected('preparedBy') ? nonEmpty(metadata.preparedBy) : '',
      office: isAttributeSelected('preparedByOffice') ? nonEmpty(metadata.preparedByOffice) : '',
    },
    {
      label: 'CHECKED BY',
      designation: isAttributeSelected('checkedBy') ? nonEmpty(metadata.checkedBy) : '',
      office: isAttributeSelected('checkedByOffice') ? nonEmpty(metadata.checkedByOffice) : '',
    },
    {
      label: 'APPROVED BY',
      designation: isAttributeSelected('approvedBy') ? nonEmpty(metadata.approvedBy) : '',
      office: isAttributeSelected('approvedByOffice') ? nonEmpty(metadata.approvedByOffice) : '',
    },
  ].filter((signOff) => signOff.designation || signOff.office);
  const showEngineeringSections = designView === 'engineering';
  const showDrawingIndex = showEngineeringSections && includeDrawingIndex;
  const showBoq = showEngineeringSections && includeBoq;
  const showSidebar = showDrawingIndex || showBoq;
  const pdfGeoLocation = project.geoLocation ?? {
    name: metadata.location || 'Falakata Distribution Feeder',
    lat: 26.7124,
    lng: 89.2845,
  };
  const showPdfMap = showMap;
  const pdfMapBounds = {
    ...(project.canvasBounds ?? getCanvasBoundsForPageSize(metadata.sheetSize)),
    x: 0,
    y: 0,
    width: 1000,
    height: 600,
  };
  const pdfMapUnderlay = showPdfMap ? (
    <MapUnderlay
      isVisible
      opacity={mapOpacity}
      locationName={metadata.location}
      geoLocation={pdfGeoLocation}
      zoom={1}
      fitZoom={1}
      panX={0}
      panY={0}
      isLocked
      layerPosition={mapLayerPosition}
      canvasBounds={pdfMapBounds}
      mapFeatures={mapFeatures}
      printMode
      mapZoomLevel={project.mapSettings?.zoomLevel ?? 16}
    />
  ) : null;
  const agencyName = isAttributeSelected('agencyName') ? nonEmpty(metadata.agencyName) : '';
  const drawingTitle = isAttributeSelected('title') ? nonEmpty(metadata.title) : '';
  const projectName = isAttributeSelected('projectName') ? nonEmpty(metadata.projectName) : '';
  const drawingNumber = isAttributeSelected('drawingNo') ? nonEmpty(metadata.drawingNo) : '';
  const location = isAttributeSelected('location') ? nonEmpty(metadata.location) : '';
  const coordinates = isAttributeSelected('coordinates') ? nonEmpty(metadata.coordinates) : '';
  const workingDate = isAttributeSelected('date') ? nonEmpty(metadata.date) : '';
  const scale = isAttributeSelected('scale') ? nonEmpty(metadata.scale) : '';
  const revision = isAttributeSelected('revision') ? nonEmpty(metadata.revision) : '';

  // Compute bounding box of drawing objects to auto-scale inside the A4 sheet viewport
  const allX = [
    ...project.nodes.map((n) => n.x),
    ...project.crossings.map((c) => c.x),
    ...project.annotations.map((annotation) => annotation.x),
    ...(project.mapRoadOutlines || []).flatMap((road) => road.points.map((point) => point.x)),
  ];
  const allY = [
    ...project.nodes.map((n) => n.y),
    ...project.crossings.map((c) => c.y),
    ...project.annotations.map((annotation) => annotation.y),
    ...(project.mapRoadOutlines || []).flatMap((road) => road.points.map((point) => point.y)),
  ];

  const minX = allX.length > 0 ? Math.min(...allX) - 60 : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) + 60 : 1000;
  const minY = allY.length > 0 ? Math.min(...allY) - 60 : 0;
  const maxY = allY.length > 0 ? Math.max(...allY) + 60 : 600;

  const contentWidth = Math.max(maxX - minX, 400);
  const contentHeight = Math.max(maxY - minY, 300);

  const handleDownloadPdf = async () => {
    if (!sheetRef.current) return;
    const sheet = sheetRef.current;
    const previousZoom = sheet.style.zoom;
    try {
      setIsExportingPdf(true);
      sheet.style.zoom = '1';
      await exportToA4Pdf(sheet, project, (status) => setExportStatus(status));
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Please try printing to PDF using the Print button.');
    } finally {
      sheet.style.zoom = previousZoom;
      setIsExportingPdf(false);
      setExportStatus('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSvg = () => {
    if (svgRef.current) {
      exportToSvg(svgRef.current, `${project.metadata.drawingNo || 'powerline'}.svg`);
    }
  };

  const handleDownloadPng = async () => {
    if (sheetRef.current) {
      const sheet = sheetRef.current;
      const previousZoom = sheet.style.zoom;
      try {
        sheet.style.zoom = '1';
        await exportToPng(sheet, `${project.metadata.drawingNo || 'powerline'}.png`);
      } finally {
        sheet.style.zoom = previousZoom;
      }
    }
  };

  const handleDownloadJson = () => {
    exportToJson(project);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* Container (Clean Light Theme Modal) */}
      <div className="bg-white w-full h-full overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="p-2 sm:p-3.5 sm:px-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>A4 Landscape Drawing Sheet Export</span>
                <span className="text-[10px] font-mono bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-semibold">
                  297mm × 210mm
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Clean A4 landscape sheet with populated project details, drawing index, and work quantities.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 max-w-full">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
              title="Print directly or Save as PDF via system dialog"
            >
              <Printer className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? exportStatus || 'Exporting...' : 'Download A4 PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPdfSettings((visible) => !visible)}
              aria-expanded={showPdfSettings}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                showPdfSettings
                  ? 'bg-sky-100 text-sky-800 border-sky-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Configure PDF attributes and design view"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">PDF Setup</span>
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            <button
              onClick={handleDownloadSvg}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs flex items-center gap-1 border border-slate-200"
              title="Download vector SVG"
            >
              <FileCode className="w-4 h-4" />
              <span className="hidden md:inline">SVG</span>
            </button>

            <button
              onClick={handleDownloadPng}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs flex items-center gap-1 border border-slate-200"
              title="Download raster PNG"
            >
              <Image className="w-4 h-4" />
              <span className="hidden md:inline">PNG</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs flex items-center gap-1 border border-slate-200"
              title="Export complete JSON project backup"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">JSON</span>
            </button>

            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Notice */}
        {downloadSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-1.5 text-xs text-center flex items-center justify-center gap-1.5 font-medium">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>A4 Landscape PDF successfully generated and downloaded!</span>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {showPdfSettings && (
            <section
              aria-label="PDF output settings"
              className="shrink-0 w-full md:w-[320px] md:max-w-[40vw] md:min-w-[260px] max-h-[38vh] md:max-h-none md:h-full overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 bg-white px-4 py-4"
            >
            <div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">PDF output setup</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose a sheet layout and the project details to print. Empty values are always omitted.
                </p>
              </div>
              <div className="mt-3 flex flex-col items-stretch gap-2 text-xs">
                <span className="font-semibold text-slate-600">Design view</span>
                <button
                  type="button"
                  onClick={() => setDesignView('engineering')}
                  aria-pressed={designView === 'engineering'}
                  className={`px-3 py-1.5 rounded-lg border font-semibold ${
                    designView === 'engineering'
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Engineering sheet
                </button>
                <button
                  type="button"
                  onClick={() => setDesignView('drawing')}
                  aria-pressed={designView === 'drawing'}
                  className={`px-3 py-1.5 rounded-lg border font-semibold ${
                    designView === 'drawing'
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Drawing focus
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Project attributes
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAttributes(PDF_ATTRIBUTES.map(({ key }) => key))}
                      className="text-[11px] font-semibold text-sky-700 hover:text-sky-900"
                    >
                      Select all
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAttributes([])}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-y-2">
                  {PDF_ATTRIBUTES.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAttributes.includes(key)}
                        onChange={(event) => {
                          setSelectedAttributes((current) =>
                            event.target.checked
                              ? [...current, key]
                              : current.filter((attribute) => attribute !== key)
                          );
                        }}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {designView === 'engineering' && (
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                    Sheet sections
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeDrawingIndex}
                        onChange={(event) => setIncludeDrawingIndex(event.target.checked)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      Drawing index / legend
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeBoq}
                        onChange={(event) => setIncludeBoq(event.target.checked)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      Work quantities (BOQ)
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTitleBlock}
                        onChange={(event) => setIncludeTitleBlock(event.target.checked)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      Project title block
                    </label>
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMap}
                  onChange={(event) => onMapVisibilityChange(event.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>Show map on canvas & PDF</span>
              </label>
            </div>
            </section>
          )}

          {/* Preview Area: Renders the precise A4 Landscape Sheet */}
          <div
            ref={previewRef}
            className="flex-1 min-w-0 min-h-0 bg-slate-200 p-2 sm:p-4 overflow-auto flex items-center justify-center"
          >
          {/* THE OFFICIAL A4 LANDSCAPE SHEET (Aspect Ratio ~ 1.414, 297mm x 210mm) */}
          <div
            ref={sheetRef}
            className="print-sheet bg-white text-black w-[1050px] h-[742px] shrink-0 shadow-xl relative flex flex-col font-sans select-none overflow-hidden"
            style={{
              padding: '12px',
              zoom: previewScale,
            }}
          >
            {/* Outer & Inner Engineering CAD Border Frame */}
            <div className="w-full h-full border-[2.5px] border-black flex flex-col relative p-1.5">
              <div className="w-full h-full border border-black flex flex-col relative">

                {/* 1. TOP HEADER: Only populated project details are printed. */}
                <div className="min-h-[72px] border-b border-black grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-stretch text-[9px] leading-tight shrink-0 bg-white">
                  <div className="min-w-0 flex flex-col justify-center gap-1 px-3 py-2">
                    {(drawingTitle || projectName) && (
                      <div className="text-[12px] font-black uppercase tracking-wider text-black break-words">
                        {drawingTitle || projectName}
                      </div>
                    )}
                    {location && (
                      <div className="text-[10px] text-gray-700 font-semibold break-words">
                        LOCATION: {location}
                      </div>
                    )}
                    {workingDate && (
                      <div className="text-[9px] text-gray-700">
                        <strong>WORKING DATE: </strong>{workingDate}
                      </div>
                    )}
                    {coordinates && (
                      <div className="text-[8px] text-gray-600 break-words">
                        COORDINATES: {coordinates}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 border-l border-black grid grid-cols-[minmax(0,1fr)_auto]">
                    <div className="grid grid-cols-2 content-center gap-x-3 gap-y-1 px-2 py-1.5 text-[8px]">
                      {referenceDetails.map(([label, value]) => (
                        <div key={label} className="min-w-0 break-words">
                          <strong>{label}: </strong>{value}
                        </div>
                      ))}
                    </div>
                    <div className="border-l border-black flex items-center gap-2 px-2">
                      <div className="text-right text-[8px] space-y-1">
                        {scale && <div><strong>SCALE: </strong>{scale}</div>}
                        {revision && <div><strong>REV: </strong>{revision}</div>}
                        <div><strong>SHEET: </strong>1 OF 1</div>
                      </div>
                      <div className="w-6 flex flex-col items-center">
                        <span className="text-[8px] font-bold">N</span>
                        <svg width="14" height="20" viewBox="0 0 20 28">
                          <polygon points="10,0 2,24 10,18" fill="#000" />
                          <polygon points="10,0 18,24 10,18" fill="#fff" stroke="#000" strokeWidth="1" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. MIDDLE AREA: Left CAD Drawing Viewport + Right Side Tables (Index & BOQ) */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Drawing Canvas Viewport */}
                  <div className={`flex-1 h-full relative overflow-hidden bg-white p-2 ${showSidebar ? 'border-r border-black' : ''}`}>
                    {mapLayerPosition === 'underlay' && pdfMapUnderlay}
                    <svg
                      ref={svgRef}
                      className="w-full h-full"
                      viewBox={`${minX} ${minY} ${contentWidth} ${contentHeight}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {/* River and Road Crossings */}
                      {mapFeatures.crossings && project.crossings.map((crossing) => (
                        <CrossingRenderer
                          key={crossing.id}
                          crossing={crossing}
                          isSelected={false}
                          onSelect={() => {}}
                        />
                      ))}

                      {(project.mapRoadOutlines || []).map((road) => (
                        <polyline
                          key={road.id}
                          points={road.points.map(({ x, y }) => `${x},${y}`).join(' ')}
                          fill="none"
                          stroke="#475569"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}

                      {/* Conductors */}
                      {project.edges.map((edge) => {
                        const fromNode = project.nodes.find((n) => n.id === edge.fromNodeId);
                        const toNode = project.nodes.find((n) => n.id === edge.toNodeId);
                        if (!fromNode || !toNode) return null;

                        return (
                          <ConductorRenderer
                            key={edge.id}
                            edge={edge}
                            fromNode={fromNode}
                            toNode={toNode}
                            isSelected={false}
                            onSelect={() => {}}
                          />
                        );
                      })}

                      {/* Stays */}
                      {project.stays.map((stay) => {
                        const pole = project.nodes.find((n) => n.id === stay.poleId);
                        if (!pole) return null;

                        return (
                          <StayRenderer
                            key={stay.id}
                            stay={stay}
                            pole={pole}
                            isSelected={false}
                            onSelect={() => {}}
                          />
                        );
                      })}

                      {/* Nodes */}
                      {project.nodes.map((node) => (
                        <NodeRenderer
                          key={node.id}
                          node={node}
                          isSelected={false}
                          onSelect={() => {}}
                          onMouseDown={() => {}}
                        />
                      ))}

                      {/* Text Annotations */}
                      {project.annotations.map((ann) => (
                        <g
                          key={ann.id}
                          transform={`translate(${ann.x}, ${ann.y}) rotate(${ann.rotation || 0})`}
                        >
                          <text
                            x="0"
                            y="0"
                            fontSize={ann.fontSize || 12}
                            fontWeight={ann.isBold ? 'bold' : 'normal'}
                            fill={ann.color || '#1e293b'}
                          >
                            {ann.text}
                          </text>
                        </g>
                      ))}
                    </svg>
                    {mapLayerPosition === 'overlay' && pdfMapUnderlay}
                  </div>

                  {/* Right Side Column: DRAWING INDEX & BOQ SCHEDULE */}
                  {showSidebar && (
                  <div className={`w-[330px] h-full flex flex-col bg-white shrink-0 overflow-hidden text-[10px] ${showDrawingIndex && showBoq ? 'divide-y divide-black' : ''}`}>
                    {/* DRAWING INDEX SECTION */}
                    {showDrawingIndex && <div className={showBoq ? 'flex-1 min-h-0 overflow-hidden' : 'h-full overflow-y-auto'}>
                      <div className="bg-gray-100 font-extrabold text-[10px] text-center py-1 border-b border-black uppercase tracking-wider">
                        DRAWING INDEX / LEGEND
                      </div>
                      <div className="p-1 space-y-1">
                        <table className="w-full text-left border-collapse">
                          <tbody>
                            {indexEntries.slice(0, 7).map((entry) => (
                              <tr key={entry.id} className="border-b border-gray-200">
                                <td className="w-12 py-1 px-1 text-center align-middle">
                                  {/* Small visual symbol key */}
                                  {entry.symbolKey === 'pole_8m' && (
                                    <div className="w-4 h-4 rounded-full border-2 border-dashed border-red-600 mx-auto" />
                                  )}
                                  {entry.symbolKey === 'pole_9m' && (
                                    <div className="w-4 h-4 rounded-full border-2 border-red-600 font-bold text-[8px] flex items-center justify-center text-red-600 mx-auto">
                                      9
                                    </div>
                                  )}
                                  {entry.symbolKey === 'dp_structure' && (
                                    <div className="text-red-600 font-bold text-xs">⚯</div>
                                  )}
                                  {entry.symbolKey === 'dtr' && (
                                    <div className="text-red-600 font-bold text-[11px]">⧖</div>
                                  )}
                                  {entry.symbolKey === 'ht_stay' && (
                                    <span className="text-red-600 font-bold text-sm">➔</span>
                                  )}
                                  {entry.symbolKey === 'lt_stay' && (
                                    <span className="text-blue-600 font-bold text-sm">➔</span>
                                  )}
                                  {entry.symbolKey === 'acsr_4wire' && (
                                    <span className="text-red-600 font-mono text-[9px] font-bold">--||||--</span>
                                  )}
                                  {entry.symbolKey === 'acsr_3wire' && (
                                    <span className="text-red-600 font-mono text-[9px] font-bold">--|||--</span>
                                  )}
                                  {entry.symbolKey === 'lt_ab_cable' && (
                                    <span className="text-blue-600 font-mono text-[9px] font-bold">-- - --</span>
                                  )}
                                  {entry.symbolKey === 'phase_conversion' && (
                                    <span className="text-red-600 font-bold text-[9px]">1Ø→3Ø</span>
                                  )}
                                  {entry.symbolKey === 'cradle_guard' && (
                                    <span className="text-emerald-700 font-bold text-[10px]">] [</span>
                                  )}
                                  {entry.symbolKey === 'exist_pole' && (
                                    <div className="w-3.5 h-3.5 rounded-full border border-black mx-auto" />
                                  )}
                                </td>
                                <td className="py-1 px-1.5 text-[9.5px] font-medium leading-tight">
                                  {entry.description}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>}

                    {/* WORK QUANTITIES (BOQ) SCHEDULE */}
                    {showBoq && (
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                      <div className="bg-gray-100 font-extrabold text-[10px] text-center py-1 border-b border-black uppercase tracking-wider">
                        WORK QUANTITIES / BOQ SCHEDULE
                      </div>
                      <div className="flex-1 overflow-y-auto p-1">
                        <table className="w-full text-left border-collapse text-[9.5px]">
                          <thead>
                            <tr className="border-b border-black font-bold bg-gray-50 text-[9px]">
                              <th className="py-0.5 px-1 w-6">SL</th>
                              <th className="py-0.5 px-1">DESCRIPTION</th>
                              <th className="py-0.5 px-1 text-right w-16">QTY</th>
                              <th className="py-0.5 px-1 w-10 text-center">UNIT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {boqItems.map((item) => (
                              <tr key={item.id}>
                                <td className="py-0.5 px-1 text-gray-600">{item.itemNumber}</td>
                                <td className="py-0.5 px-1 leading-tight">{item.description}</td>
                                <td className="py-0.5 px-1 text-right font-mono font-bold">{item.quantity}</td>
                                <td className="py-0.5 px-1 text-center text-gray-700">{item.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    )}
                  </div>
                  )}
                </div>

                {/* 3. BOTTOM TITLE BLOCK: render only values supplied in Project Setup. */}
                {showEngineeringSections && includeTitleBlock && (agencyName || applicantDetails.length > 0 ||
                  drawingTitle || projectName || drawingNumber || signOffs.length > 0) && (
                  <div className="min-h-[64px] border-t border-black flex text-[8.5px] leading-tight shrink-0 bg-white">
                    {(agencyName || applicantDetails.length > 0) && (
                      <div className="flex-1 min-w-0 p-1.5 space-y-0.5">
                        <div className="text-[7.5px] text-gray-500 font-bold uppercase">PROJECT CONTACTS</div>
                        {agencyName && (
                          <div className="font-extrabold text-[9px] uppercase break-words">
                            {agencyName}
                          </div>
                        )}
                        {applicantDetails.map(([label, value]) => (
                          <div key={label} className="break-words">
                            <strong>{label}: </strong>{value}
                          </div>
                        ))}
                      </div>
                    )}

                    {(drawingTitle || projectName || drawingNumber) && (
                      <div className="flex-1 min-w-0 border-l border-black p-1.5 space-y-1">
                        {drawingTitle && (
                          <div>
                            <div className="text-[7.5px] text-gray-500 font-bold uppercase">DRAWING TITLE</div>
                            <div className="font-bold text-[9.5px] leading-snug break-words">
                              {drawingTitle}
                            </div>
                          </div>
                        )}
                        {projectName && (
                          <div className="break-words"><strong>PROJECT: </strong>{projectName}</div>
                        )}
                        {drawingNumber && (
                          <div className="font-mono break-words"><strong>DRAWING NO: </strong>{drawingNumber}</div>
                        )}
                      </div>
                    )}

                    {signOffs.length > 0 && (
                      <div
                        className="flex-1 min-w-0 border-l border-black grid divide-x divide-black"
                        style={{ gridTemplateColumns: `repeat(${signOffs.length}, minmax(0, 1fr))` }}
                      >
                        {signOffs.map(({ label, designation, office }) => (
                          <div key={label} className="min-w-0 p-1.5 flex flex-col justify-center gap-0.5">
                            <span className="text-[7.5px] font-bold text-gray-500 uppercase">{label}</span>
                            {designation && (
                              <span className="font-semibold text-black break-words">{designation}</span>
                            )}
                            {office && (
                              <span className="text-[7.5px] font-medium text-gray-600 break-words">{office}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
