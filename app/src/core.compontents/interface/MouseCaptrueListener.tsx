export interface MouseCaptrueListener {
  onDownCaptrue(event: MouseEvent): void;
  onUpCaptrue(event: MouseEvent): void;
  onMoveCaptrue(event: MouseEvent): void;
  onClickCaptrue(event: MouseEvent): void;
  onEnterCaptrue(event: MouseEvent): void;
  onLeaveCaptrue(event: MouseEvent): void;
}
