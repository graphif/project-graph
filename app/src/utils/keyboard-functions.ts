export function getEnterKey(event: KeyboardEvent): "enter" | "ctrlEnter" | "shiftEnter" | "altEnter" | "other" {
  if (event.key === "Enter") {
    if (event.ctrlKey) {
      return "ctrlEnter";
    } else if (event.altKey) {
      return "altEnter";
    } else if (event.shiftKey) {
      return "shiftEnter";
    } else {
      return "enter";
    }
  } else {
    return "other";
  }
}
