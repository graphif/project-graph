export interface MouseListener {
  onDown(event: MouseEvent): void;
  onUp(event: MouseEvent): void;
  onMove(event: MouseEvent): void;
  onClick(event: MouseEvent): void;
  onEnter(event: MouseEvent): void;
  onLeave(event: MouseEvent): void;
}
