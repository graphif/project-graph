/**
 * XML类用于创建和操作XML文档。
 */
export class XML {
  private readonly document: XMLDocument;
  private readonly root: Element;
  private current: Element;

  /**
   * 构造函数，初始化XML文档和根元素。
   * @param namespace - XML文档的命名空间
   */
  constructor(namespace: string) {
    this.document = document.implementation.createDocument(null, namespace);
    const pi = this.document.createProcessingInstruction("xml", 'version="1.0" encoding="UTF-8"');
    this.document.insertBefore(pi, this.document.documentElement);
    this.root = this.document.lastChild as Element;
    this.current = this.root;
  }

  /**
   * 切换到指定选择器的当前元素。
   * @param selector - 选择器字符串
   * @returns 当前XML对象
   */
  cd(selector: string) {
    this.current = this.root.querySelector(selector) as Element;
    return this;
  }

  /**
   * 返回到当前元素的父节点。
   * @returns 当前XML对象
   */
  up() {
    this.current = this.current.parentNode as Element;
    return this;
  }

  /**
   * 为当前元素添加一个属性。
   * @param name - 属性名称
   * @param value - 属性值
   * @returns 当前XML对象
   */
  attr(name: string, value: string) {
    this.current.setAttribute(name, value);
    return this;
  }

  /**
   * 为当前元素添加多个属性。
   * @param attributes - 属性键值对
   * @returns 当前XML对象
   */
  attrs(attributes: Record<string, string>) {
    for (const [key, value] of Object.entries(attributes)) {
      this.current.setAttribute(key, value);
    }
    return this;
  }

  /**
   * 移除当前元素的指定属性。
   * @param name - 属性名称
   * @returns 当前XML对象
   */
  rmattr(name: string) {
    this.current.removeAttribute(name);
    return this;
  }

  /**
   * 添加一个新的子元素，并切换到该子元素。
   * @param tag - 子元素的标签名
   * @returns 当前XML对象
   */
  add(tag: string) {
    const element = this.document.createElement(tag);
    this.current.appendChild(element);
    this.current = element;
    return this;
  }

  /**
   * 添加一个文本节点。
   * @param text - 文本内容
   * @returns 当前XML对象
   */
  text(text: string) {
    this.current.textContent = text;
    return this;
  }

  /**
   * 将XML文档转换为字符串。
   * @returns XML字符串
   */
  toString() {
    return new XMLSerializer().serializeToString(this.document);
  }

  /**
   * 获取当前XML文档对象。
   * @returns XMLDocument对象
   */
  get xmlDocument() {
    return this.document;
  }
}
