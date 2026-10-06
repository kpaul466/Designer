/**
 * A4 Landscape PDF & CAD Export Modal
 * True ISO 216 A4 Landscape (297mm x 210mm) engineering layout preview & generator
 * Resolves top & bottom info duplication:
 * - Top Header: State Electricity Utility Authority, Sub-Division, Scheme, and 33/11kV Feeder Corridor
 * - Bottom Title Block: Turnkey Contractor, Applicant Details, Drawing No., Revision, and 3-tier Engineering Sign-Off Grid
 */

import React, { useRef, useState } from 'react';
import { DrawingProject } from '../../types/electrical';
import { calculateBoq, generateIndexEntries } from '../../utils/boqCalculator';
import { exportToA4Pdf, exportToJson, exportToPng, exportToSvg } from '../../utils/pdfExport';
import { Check, Download, FileCode, FileText, Image, Printer, X, Zap } from 'lucide-react';
import { ConductorRenderer } from '../Canvas/ConductorRenderer';
import { CrossingRenderer } from '../Canvas/CrossingRenderer';
import { NodeRenderer } from '../Canvas/NodeRenderer';
import { StayRenderer } from '../Canvas/StayRenderer';

interface ExportModalProps {
  isOpen: boolean;
  project: DrawingProject;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  project,
  onClose,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

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

  // Compute bounding box of drawing objects to auto-scale inside the A4 sheet viewport
  const allX = [
    ...project.nodes.map((n) => n.x),
    ...project.crossings.map((c) => c.x),
  ];
  const allY = [
    ...project.nodes.map((n) => n.y),
    ...project.crossings.map((c) => c.y),
  ];

  const minX = allX.length > 0 ? Math.min(...allX) - 60 : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) + 60 : 1000;
  const minY = allY.length > 0 ? Math.min(...allY) - 60 : 0;
  const maxY = allY.length > 0 ? Math.max(...allY) + 60 : 600;

  const contentWidth = Math.max(maxX - minX, 400);
  const contentHeight = Math.max(maxY - minY, 300);

  const handleDownloadPdf = async () => {
    if (!sheetRef.current) return;
    try {
      setIsExportingPdf(true);
      await exportToA4Pdf(sheetRef.current, project, (status) => setExportStatus(status));
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Please try printing to PDF using the Print button.');
    } finally {
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
      await exportToPng(sheetRef.current, `${project.metadata.drawingNo || 'powerline'}.png`);
    }
  };

  const handleDownloadJson = () => {
    exportToJson(project);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container (Clean Light Theme Modal) */}
      <div className="bg-white border border-slate-200 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Top Header */}
        <div className="p-3.5 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
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
                Standard electrical engineering layout with Authority Header, Drawing Index, BOQ Schedule, and Title Block.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
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

        {/* Preview Area: Renders the precise A4 Landscape Sheet */}
        <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-auto flex items-center justify-center">
          {/* THE OFFICIAL A4 LANDSCAPE SHEET (Aspect Ratio ~ 1.414, 297mm x 210mm) */}
          <div
            ref={sheetRef}
            className="print-sheet bg-white text-black w-[1050px] h-[742px] shrink-0 shadow-xl relative flex flex-col font-sans select-none overflow-hidden"
            style={{
              padding: '12px',
            }}
          >
            {/* Outer & Inner Engineering CAD Border Frame */}
            <div className="w-full h-full border-[2.5px] border-black flex flex-col relative p-1.5">
              <div className="w-full h-full border border-black flex flex-col relative">

                {/* 1. TOP HEADER: Utility Authority, Scheme & Distribution Sub-Station Banner */}
                <div className="h-18 border-b border-black flex justify-between items-start px-3 py-1.5 text-[10px] leading-tight shrink-0 bg-white">
                  {/* Left: Discom & Office Authority */}
                  <div className="space-y-0.5 max-w-[280px]">
                    <div className="font-extrabold text-[10.5px] uppercase tracking-tight text-black">
                      WEST BENGAL STATE ELECTRICITY DISTRIBUTION CO. LTD.
                    </div>
                    <div>
                      <strong>OFFICE: </strong>
                      <span>{project.metadata.subDivision || 'Falakata Sub-Division'}, {project.metadata.cccName || 'Falakata CCC'}</span>
                    </div>
                    <div>
                      <strong>SCHEME: </strong>
                      <span className="font-semibold text-gray-800">RDSS / INFRASTRUCTURE STRENGTHENING</span>
                    </div>
                    <div>
                      <strong>ESTIMATE / LOA NO: </strong>
                      <span className="font-mono font-bold">{project.metadata.poNumber || 'WBSEDCL/LOA/2026/094'}</span>
                    </div>
                  </div>

                  {/* Center: Network Corridor & Feeder Details */}
                  <div className="text-center px-2 flex-1 max-w-[420px]">
                    <div className="text-[12px] font-black uppercase tracking-wider text-black">
                      11 kV & LT DISTRIBUTION LINE NETWORK ROUTE PLAN
                    </div>
                    <div className="text-[10px] text-gray-800 mt-0.5 font-semibold">
                      FEEDER: {project.metadata.location} 33/11kV SUB-STATION CORRIDOR
                    </div>
                    <div className="text-[9px] text-gray-600">
                      VILLAGE / MOUZA: {project.metadata.location} · BLOCK: FALAKATA
                    </div>
                  </div>

                  {/* Right: Scale & Engineering North Arrow */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-[9.5px] space-y-0.5">
                      <div><strong>SCALE: </strong>{project.metadata.scale || 'NTS'}</div>
                      <div><strong>REV: </strong>{project.metadata.revision || 'R0'}</div>
                      <div><strong>SHEET: </strong>1 OF 1</div>
                    </div>
                    {/* Engineering North Arrow */}
                    <div className="w-7 h-10 flex flex-col items-center">
                      <span className="text-[9px] font-bold">N</span>
                      <svg width="16" height="22" viewBox="0 0 20 28">
                        <polygon points="10,0 2,24 10,18" fill="#000" />
                        <polygon points="10,0 18,24 10,18" fill="#fff" stroke="#000" strokeWidth="1" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 2. MIDDLE AREA: Left CAD Drawing Viewport + Right Side Tables (Index & BOQ) */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Drawing Canvas Viewport */}
                  <div className="flex-1 h-full relative overflow-hidden bg-white border-r border-black p-2">
                    <svg
                      ref={svgRef}
                      className="w-full h-full"
                      viewBox={`${minX} ${minY} ${contentWidth} ${contentHeight}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {/* River and Road Crossings */}
                      {project.crossings.map((crossing) => (
                        <CrossingRenderer
                          key={crossing.id}
                          crossing={crossing}
                          isSelected={false}
                          onSelect={() => {}}
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
                  </div>

                  {/* Right Side Column: DRAWING INDEX & BOQ SCHEDULE */}
                  <div className="w-[330px] h-full flex flex-col bg-white shrink-0 overflow-hidden text-[10px]">
                    {/* DRAWING INDEX SECTION */}
                    <div className="border-b border-black">
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
                    </div>

                    {/* WORK QUANTITIES (BOQ) SCHEDULE */}
                    <div className="flex-1 overflow-hidden flex flex-col">
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
                  </div>
                </div>

                {/* 3. BOTTOM ENGINEERING TITLE BLOCK (Turnkey Contractor, Applicant & 3-Tier Sign-Off Grid) */}
                <div className="h-20 border-t border-black grid grid-cols-12 text-[9px] leading-tight shrink-0 bg-white">
                  {/* Left: Turnkey Contractor & Applicant Profile */}
                  <div className="col-span-4 border-r border-black p-1.5 flex flex-col justify-between">
                    <div>
                      <div className="text-[8px] text-gray-500 font-bold uppercase">EXECUTING AGENCY & APPLICANT</div>
                      <div className="font-extrabold text-[9.5px] uppercase text-black">
                        {project.metadata.agencyName || 'M/S EASTERN POWER INFRASTRUCTURE'}
                      </div>
                      <div className="text-gray-800 font-medium">
                        APPLICANT: {project.metadata.applicantName || 'ASHOK SAHA'} (PH: {project.metadata.applicantPhone || '9474123890'})
                      </div>
                    </div>
                    <div className="text-[8px] text-gray-500 font-mono">
                      APP NO: {project.metadata.applicationNo || '4003705061'} · WO: {project.metadata.workOrderNo || 'WO-2026/08'}
                    </div>
                  </div>

                  {/* Middle: Drawing Title & Identification */}
                  <div className="col-span-4 border-r border-black p-1.5 flex flex-col justify-between">
                    <div>
                      <div className="text-[8px] text-gray-500 font-bold uppercase">DRAWING TITLE</div>
                      <div className="font-bold text-[10px] leading-snug line-clamp-2 text-black">
                        {project.metadata.title}
                      </div>
                    </div>
                    <div className="font-mono text-[8.5px] text-gray-700 flex justify-between">
                      <span>DRG NO: {project.metadata.drawingNo || 'DWG/WB/2026/01'}</span>
                      <span>DATE: {project.metadata.date || new Date().toISOString().split('T')[0]}</span>
                    </div>
                  </div>

                  {/* Right: Official Discom Engineering Approval Sign-Off Grid */}
                  <div className="col-span-4 grid grid-cols-3 divide-x divide-black">
                    <div className="p-1 flex flex-col justify-between">
                      <span className="text-[7.5px] font-bold text-gray-500 uppercase">SURVEYED BY</span>
                      <span className="font-semibold truncate text-black">{project.metadata.preparedBy || 'Surveyor'}</span>
                      <span className="text-[7.5px] text-gray-500 font-mono">DRAFTSMAN</span>
                    </div>
                    <div className="p-1 flex flex-col justify-between">
                      <span className="text-[7.5px] font-bold text-gray-500 uppercase">CHECKED BY</span>
                      <span className="font-semibold truncate text-black">{project.metadata.checkedBy || 'SAE / JE (E)'}</span>
                      <span className="text-[7.5px] text-emerald-700 font-bold">VERIFIED</span>
                    </div>
                    <div className="p-1 flex flex-col justify-between bg-gray-50/50">
                      <span className="text-[7.5px] font-bold text-gray-500 uppercase">APPROVED BY</span>
                      <span className="font-semibold truncate text-black">{project.metadata.approvedBy || 'DE / AEE (E)'}</span>
                      <span className="text-[7.5px] text-red-700 font-black">DISCOM APPVD</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
