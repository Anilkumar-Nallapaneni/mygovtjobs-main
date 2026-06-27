export interface StateData {
  id: string;
  fill: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customData?: Record<string, any>;
}

export interface MapStyle {
  stroke: string;
  strokeWidth: number;
  hoverColor: string;
  backgroundColor?: string;
  tooltipConfig?: TooltipConfig;
}

export interface TooltipConfig {
  backgroundColor: string;
  textColor: string;
  fontSize: string;
  padding: string;
  borderRadius: string;
}

export interface IndiaMapProps {
  mapStyle?: MapStyle;
  stateData?: StateData[];
  onStateClick?: (stateId: string) => void;
  onStateHover?: (stateName: string) => void;
  /** When set, only this state path is shown and the SVG zooms to fit it. */
  isolateStateId?: string | null;
  /** When this value changes (e.g. map filter cleared), all path fills reset to the palette — clears stuck hover / no persistent “selected” fill. */
  selectionSyncKey?: string | null;
}

export const defaultMapStyle: MapStyle = {
  stroke: "#000000",
  strokeWidth: 1.2,
  hoverColor: "#d3d3d3",
  backgroundColor: "#ffffff",
  tooltipConfig: {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    textColor: "#ffffff",
    fontSize: "14px",
    padding: "8px 12px",
    borderRadius: "4px",
  },
};
