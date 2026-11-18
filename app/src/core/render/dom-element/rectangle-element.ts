import { Color } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

/**
 * 测试canvas上叠放dom元素
 */
export namespace RectangleElement {
  export function div(rectangle: Rectangle, color: Color) {
    const divElement = document.createElement("div");
    divElement.style.position = "fixed";
    divElement.style.top = `${rectangle.location.y}px`;
    divElement.style.left = `${rectangle.location.x}px`;
    divElement.style.width = `${rectangle.size.x}px`;
    divElement.style.height = `${rectangle.size.y}px`;
    divElement.style.backgroundColor = color.toString();
    document.body.appendChild(divElement);
  }
}
