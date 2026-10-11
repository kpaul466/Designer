/**
 * Core type definitions for PowerLine Designer
 */

export type InfrastructureStatus = 'existing' | 'proposed' | 'removed' | 'modified';

export type NodeType =
  | 'pole_8m'
  | 'pole_9m'
  | 'pole_single'
  | 'pole_rsj'
  | 'pole_stp'
  | 'dp_structure'
  | 'four_pole'
  | 'dtr_25kva'
  | 'dtr_63kva'
  | 'dtr_100kva'
  | 'dtr_conversion'
  | 'ab_switch'
  | 'hg_fuse'
  | 'lt_distribution_box'
  | 'lightning_arrester'
  | 'consumer_house'
  | 'commercial_facility'
  | 'landmark_religious'
  | 'landmark_school'
  | 'substation_tap'
  | 'custom_symbol';

export interface ElectricalNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  rotation: number;
  status: InfrastructureStatus;
  label?: string;
  customToolId?: string; // Links to CustomToolDefinition if type === 'custom_symbol'
  properties: {
    poleNumber?: string;
    height?: '8M' | '9M' | '10M' | '11M';
    material?: 'PCC' | 'RSJ' | 'STEEL' | 'RAIL' | 'STP';
    capacityKva?: 16 | 25 | 63 | 100 | 160 | 250;
    conversionCapacityKva?: number; // e.g. 63 to 100
    consumerName?: string;
    consumerAddress?: string;
    consumerPhone?: string;
    serviceConnectionCount?: number; // e.g. S/C-6, S/C-4
    structureType?: string;
    notes?: string;
    customName?: string;
    customShape?: string;
    customColor?: string;
  };
}

export type ConductorType =
  | 'acsr_3wire'
  | 'acsr_4wire'
  | 'acsr_2wire'
  | 'lt_ab_cable'
  | 'ht_ug_cable'
  | 'earth_wire'
  | 'jumper_connection'
  | 'phase_conversion'
  | 'cradle_guard'
  | 'ht_oh_line'
  | 'resagging_line';

export interface ConductorEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: ConductorType;
  status: InfrastructureStatus;
  spanMeters: number; // e.g. 45, 40, 50
  manualSpanOverride?: string;
  wireGauge?: string; // e.g. '50 sq.mm', 'Rabbit', 'Weasel', 'Dog'
  isResagging?: boolean;
  label?: string;
}

export type StayType = 'ht_stay' | 'lt_stay';

export interface StayItem {
  id: string;
  poleId: string;
  type: StayType;
  angle: number; // angle in degrees from pole
  length: number;
  status: InfrastructureStatus;
  count: number; // e.g. 1 set, 2 sets, 5 sets
}

export type CrossingType = 'river' | 'road' | 'railway';

export interface MapFeatureSelection {
  roads: boolean;
  rivers: boolean;
  streetNames: boolean;
  placeNames: boolean;
  crossings: boolean;
}

export interface MapRoadCandidate {
  id: string;
  name: string;
  points: Array<{ x: number; y: number }>;
}

export interface MapRoadOutline extends MapRoadCandidate {
  sourceId: string;
}

export interface CrossingFeature {
  id: string;
  type: CrossingType;
  name: string; // e.g. "RIVER CROSSING", "FALAKATA - BIRPARA - ROAD", "NH Road"
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  spans?: string[]; // e.g. ["50M", "60M", "32M"]
}

export interface AnnotationItem {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  rotation?: number;
  isBold?: boolean;
}

export interface BoqItem {
  id: string;
  itemNumber: number;
  description: string;
  quantity: string;
  unit: string;
  isAutoCalculated: boolean;
  category: 'pole' | 'conductor' | 'stay' | 'transformer' | 'equipment' | 'guard' | 'connection' | 'custom';
}

export interface IndexEntry {
  id: string;
  number: number;
  description: string;
  symbolKey: string;
  status: InfrastructureStatus;
}

export type SheetSizeType = 'A4' | 'A3' | 'A2' | 'corridor' | 'square';

export interface ProjectMetadata {
  title: string;
  drawingNo: string;
  applicationNo: string;
  poNumber: string;
  agencyName: string;
  cccName: string;
  divisionName: string;
  workOrderNo: string;
  projectName: string;
  applicantName: string;
  applicantAddress: string;
  applicantPhone: string;
  location: string;
  coordinates?: string;
  subDivision: string;
  preparedBy: string;
  checkedBy: string;
  approvedBy: string;
  preparedByOffice?: string;
  checkedByOffice?: string;
  approvedByOffice?: string;
  date: string;
  revision: string;
  sheetSize: SheetSizeType;
  orientation: 'landscape';
  scale: string;
}

export interface CanvasBounds {
  width: number;
  height: number;
  x: number;
  y: number;
  preset: SheetSizeType;
  showSheetBorder: boolean;
  sheetFillOpacity?: number; // 0 for transparent vector on map, up to 1 for solid paper
}

export interface GeoLocation {
  name: string;
  lat: number;
  lng: number;
  district?: string;
  state?: string;
  description?: string;
  category?: 'substation' | 'town' | 'crossing' | 'landmark' | 'general';
}

export interface MapSettings {
  visible: boolean;
  opacity: number;
  mapType: 'osm';
  zoomLevel: number; // Slippy tile zoom level (12 to 19)
  scale: number; // Feature scale multiplier (0.5 to 2.0)
  sizeMode: 'fullscreen' | 'canvas_fit' | 'custom';
  customWidth?: number;
  customHeight?: number;
  offsetX?: number;
  offsetY?: number;
  isLocked: boolean;
  layerPosition?: 'underlay' | 'overlay';
  features?: MapFeatureSelection;
  pinnedPlaces?: GeoLocation[];
  activePlace?: GeoLocation | null;
}

export interface CustomToolDefinition {
  id: string;
  name: string;
  category: 'pole' | 'equipment' | 'line' | 'landmark';
  shape: 'circle' | 'square' | 'diamond' | 'hexagon' | 'coil' | 'cross' | 'text';
  color: string;
  defaultStatus: InfrastructureStatus;
  unit: 'Nos' | 'Set' | 'KM' | 'Mtr';
  boqDescription: string;
  iconText: string;
}

export interface DrawingProject {
  id: string;
  title: string;
  metadata: ProjectMetadata;
  nodes: ElectricalNode[];
  edges: ConductorEdge[];
  stays: StayItem[];
  crossings: CrossingFeature[];
  annotations: AnnotationItem[];
  customTools?: CustomToolDefinition[];
  customBoqOverrides?: Record<string, string>;
  canvasBounds?: CanvasBounds;
  geoLocation?: GeoLocation;
  mapSettings?: MapSettings;
  mapRoadOutlines?: MapRoadOutline[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type ActiveTool =
  | 'select'
  | 'pan'
  | 'pole_8m'
  | 'pole_9m'
  | 'pole_single'
  | 'pole_rsj'
  | 'pole_stp'
  | 'dp_structure'
  | 'four_pole'
  | 'dtr_25kva'
  | 'dtr_63kva'
  | 'dtr_100kva'
  | 'dtr_conversion'
  | 'ab_switch'
  | 'hg_fuse'
  | 'lt_distribution_box'
  | 'lightning_arrester'
  | 'consumer_house'
  | 'commercial_facility'
  | 'landmark_religious'
  | 'landmark_school'
  | 'acsr_2wire'
  | 'acsr_3wire'
  | 'acsr_4wire'
  | 'lt_ab_cable'
  | 'ht_ug_cable'
  | 'earth_wire'
  | 'jumper_connection'
  | 'phase_conversion'
  | 'cradle_guard'
  | 'ht_stay'
  | 'lt_stay'
  | 'river_crossing'
  | 'road_crossing'
  | 'freeform_road'
  | 'road_segment'
  | 'railway_crossing'
  | 'text_annotation'
  | 'measure'
  | `custom_${string}`;

export interface SelectedItem {
  type: 'node' | 'edge' | 'stay' | 'crossing' | 'annotation' | 'mapRoad';
  id: string;
}
