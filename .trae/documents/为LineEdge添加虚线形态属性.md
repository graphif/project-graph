1. 在LineEdge类中添加线条类型属性：
   - 在LineEdge.tsx中添加`@serializable`装饰的`lineType`属性，使用字符串枚举类型

   - 支持的值：'solid'（实线）和'dashed'（虚线），后续可扩展

   - 在构造函数中初始化该属性为'solid'

   - 更新相关类型定义

2. 更新渲染逻辑：
   - 在StraightEdgeRenderer.tsx中修改renderNormalState和renderShiftingState方法，根据lineType属性选择调用renderSolidLine或renderDashedLine

   - 确保其他渲染器（如SymmetryCurveEdgeRenderer和VerticalPolyEdgeRenderer）也支持虚线渲染

3. 更新序列化和反序列化：
   - 确保lineType属性能够被正确序列化和反序列化

   - 在convertVAnyToN1函数中，为LineEdge添加lineType属性，默认值为'solid'

4. 测试和验证：
   - 确保新属性能够被正确保存和加载

   - 测试实线和虚线的渲染效果

   - 确保现有功能不受影响
