/// 一个支持缓动过渡的值容器，适用于需要平滑动画效果的场景。
///
/// # Examples
///
/// ```
/// # use project_graph::smooth_value::SmoothValue;
/// let mut smooth = SmoothValue::new(0.0).with_speed(5.0);
/// smooth.set(10.0);
/// // 模拟每帧更新，假设每帧间隔为 0.032 秒（约 30 FPS）
/// for _ in 0..100 {
///     smooth.tick(0.032);
///     println!("Current value: {}", smooth.get());
/// }
/// // 最终值应该接近目标值
/// assert!((smooth.get() - 10.0).abs() < 0.01);
/// ```
pub struct SmoothValue<T> {
    current: T,
    target: T,
    /// 缓动系数
    speed: f32,
}

impl<T> SmoothValue<T>
where
    T: std::ops::Add<Output = T>
        + std::ops::Sub<Output = T>
        + std::ops::Mul<f32, Output = T>
        + Copy,
{
    pub fn new(initial: T) -> Self {
        Self {
            current: initial,
            target: initial,
            speed: 10.0,
        }
    }
    /// 指数衰减速率系数
    /// 物体完成约 63.2% 的过渡所需的时间为 1/speed 秒
    /// 较高的值会更快地接近目标值，但可能会产生更明显的动画跳跃
    pub fn with_speed(mut self, speed: f32) -> Self {
        self.speed = speed;
        self
    }

    /// 更新当前值，应该在每帧调用，dt 是与上一帧的时间间隔（秒）
    pub fn tick(&mut self, dt: f32) {
        let lerp_factor = (1.0 - (-self.speed * dt).exp()).clamp(0.0, 1.0);

        // 确保 T 在左边，f32 在右边，以匹配 T: Mul<f32>
        let delta = (self.target - self.current) * lerp_factor;
        self.current = self.current + delta;
    }

    /// 设置目标值
    pub fn set(&mut self, target: T) {
        self.target = target;
    }
    /// 立刻将当前值和目标值设置为指定值
    pub fn snap(&mut self, value: T) {
        self.current = value;
        self.target = value;
    }

    /// 获取目标值
    pub fn target(&self) -> T {
        self.target
    }
    /// 获取当前值
    pub fn get(&self) -> T {
        self.current
    }
}
