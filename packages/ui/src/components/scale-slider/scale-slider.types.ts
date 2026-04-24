export interface ScaleSliderStates {
  compact: boolean;
  current: number;
  disabled: boolean;
  flowValue: number;
  max: number;
  maxDecimals: number;
  min: number;
  step: number;
  /** `percent`: NumberFlow shows normalized range as %; `number`: raw `current`. */
  valueDisplay: "percent" | "number";
}

export interface ScaleSliderActions {
  /** Called when slider value changes (after clamping). */
  onScale?: (value: number) => void;
}

export interface ScaleSliderValue {
  actions: ScaleSliderActions;
  states: ScaleSliderStates;
}
