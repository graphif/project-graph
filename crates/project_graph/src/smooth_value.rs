/// 数据结构，用于实现缓动效果
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
    pub fn with_speed(mut self, speed: f32) -> Self {
        self.speed = speed;
        self
    }

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
