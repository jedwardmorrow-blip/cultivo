declare module 'jsbarcode' {
  interface JsBarcodeOptions {
    format?: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    margin?: number;
  }

  function JsBarcode(
    element: HTMLCanvasElement | HTMLImageElement | SVGElement | string,
    value: string | number,
    options?: JsBarcodeOptions
  ): void;

  export default JsBarcode;
}
