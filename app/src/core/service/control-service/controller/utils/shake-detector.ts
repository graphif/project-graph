import { Vector } from "@graphif/data-structures";

/**
 * 拖拽摇晃检测器
 * 用于检测用户在拖拽节点时是否进行快速来回摇晃动作（扁平形状，非圆形转动）
 * 如果检测到摇晃，可以触发特定操作（如将节点从连线结构中脱离）
 */
export class ShakeDetector {
  // 配置参数 - 使用窗口坐标（屏幕像素），与世界坐标缩放无关
  private readonly sampleInterval = 50; // 采样间隔(ms)
  private readonly maxSamples = 10; // 最大采样点数
  private readonly directionChangeThreshold = 3; // 方向改变次数阈值
  private readonly minShakeDistance = 100; // 最小摇晃距离（窗口坐标，像素）
  private readonly timeWindow = 500; // 时间窗口(ms)
  private readonly minMoveThreshold = 8; // 忽略微小移动的阈值（窗口坐标，像素）
  private readonly minSpeedThreshold = 15; // 最小速度阈值，过滤掉过慢的移动（像素/采样间隔）
  private readonly minAspectRatio = 2.0; // 最小长宽比，确保摇晃是扁平的（来回）而非圆形

  private samples: { location: Vector; time: number }[] = [];
  private lastSampleTime = 0;
  private triggered = false;

  /**
   * 重置检测器状态
   */
  reset(): void {
    this.samples = [];
    this.lastSampleTime = 0;
    this.triggered = false;
  }

  /**
   * 添加一个新的位置样本
   * @param location 当前位置（窗口坐标/屏幕像素）
   * @param currentTime 当前时间戳
   * @returns 是否检测到摇晃
   */
  addSample(location: Vector, currentTime: number): boolean {
    if (this.triggered) {
      return false; // 已经触发过，不再检测
    }

    // 控制采样频率
    if (currentTime - this.lastSampleTime < this.sampleInterval) {
      return false;
    }
    this.lastSampleTime = currentTime;

    // 添加新样本
    this.samples.push({ location: location.clone(), time: currentTime });

    // 清理过期样本
    const cutoffTime = currentTime - this.timeWindow;
    while (this.samples.length > 0 && this.samples[0].time < cutoffTime) {
      this.samples.shift();
    }

    // 限制样本数量
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    // 检测摇晃
    return this.checkShake();
  }

  /**
   * 检测是否发生摇晃
   * 算法：检测在一定时间窗口内，快速来回移动（扁平形状）
   */
  private checkShake(): boolean {
    if (this.samples.length < 4) {
      return false;
    }

    // 计算包围盒和总距离
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let totalDistance = 0;
    let directionChanges = 0;
    let lastDirectionX = 0;
    let lastDirectionY = 0;
    let fastMoveCount = 0;

    for (let i = 1; i < this.samples.length; i++) {
      const prev = this.samples[i - 1];
      const curr = this.samples[i];
      const diff = curr.location.subtract(prev.location);
      const distance = diff.magnitude();

      // 更新包围盒
      minX = Math.min(minX, prev.location.x, curr.location.x);
      maxX = Math.max(maxX, prev.location.x, curr.location.x);
      minY = Math.min(minY, prev.location.y, curr.location.y);
      maxY = Math.max(maxY, prev.location.y, curr.location.y);

      // 忽略微小移动
      if (distance < this.minMoveThreshold) {
        continue;
      }

      totalDistance += distance;

      // 统计快速移动次数（用于判断是否为快速摇晃）
      if (distance >= this.minSpeedThreshold) {
        fastMoveCount++;
      }

      // 计算当前方向（简化为一维方向）
      const currentDirectionX = diff.x > 0 ? 1 : diff.x < 0 ? -1 : 0;
      const currentDirectionY = diff.y > 0 ? 1 : diff.y < 0 ? -1 : 0;

      // 检测X方向改变
      if (lastDirectionX !== 0 && currentDirectionX !== 0 && lastDirectionX !== currentDirectionX) {
        directionChanges++;
      }

      // 检测Y方向改变
      if (lastDirectionY !== 0 && currentDirectionY !== 0 && lastDirectionY !== currentDirectionY) {
        directionChanges++;
      }

      if (currentDirectionX !== 0) {
        lastDirectionX = currentDirectionX;
      }
      if (currentDirectionY !== 0) {
        lastDirectionY = currentDirectionY;
      }
    }

    // 需要足够多的快速移动（确保是快速摇晃而非慢速拖动）
    if (fastMoveCount < 3) {
      return false;
    }

    // 计算长宽比，确保是扁平形状（来回摇晃）而非圆形
    const width = maxX - minX;
    const height = maxY - minY;

    // 如果移动范围太小，不认为是有效摇晃
    if (width < 30 && height < 30) {
      return false;
    }

    const aspectRatioX = height > 0 ? width / height : Infinity;
    const aspectRatioY = width > 0 ? height / width : Infinity;
    const isFlatShape = aspectRatioX >= this.minAspectRatio || aspectRatioY >= this.minAspectRatio;

    // 判断是否为有效摇晃：
    // 1. 方向改变次数足够（来回次数）
    // 2. 总距离足够
    // 3. 是扁平形状（来回摇晃而非转圈）
    if (directionChanges >= this.directionChangeThreshold && totalDistance >= this.minShakeDistance && isFlatShape) {
      this.triggered = true;
      return true;
    }

    return false;
  }

  /**
   * 标记为已触发，防止重复触发
   */
  markTriggered(): void {
    this.triggered = true;
  }

  /**
   * 检查是否已经触发过
   */
  hasTriggered(): boolean {
    return this.triggered;
  }
}
