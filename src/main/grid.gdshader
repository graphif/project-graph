shader_type canvas_item;

// 从 Camera2D 脚本实时传入的参数
uniform vec2 camera_offset = vec2(0.0); // Camera2D 的 global_position
uniform vec2 camera_zoom = vec2(1.0);   // Camera2D 的 zoom

// 网格外观自定义参数
uniform vec4 bg_color : source_color = vec4(0.1, 0.1, 0.1, 1.0);     // 背景颜色
uniform vec4 grid_color : source_color = vec4(0.3, 0.3, 0.3, 1.0);   // 网格线颜色
uniform float grid_size = 64.0;                                       // 网格单元基础大小（世界单位像素）
uniform float line_thickness = 1.0;                                   // 网格线条粗细（屏幕像素）

void fragment() {
    // 1. 获取当前视口屏幕的总像素尺寸
    vec2 screen_size = 1.0 / SCREEN_PIXEL_SIZE;
    
    // 2. 计算当前片段像素相对于屏幕中心的偏移像素坐标
    vec2 screen_pos_from_center = FRAGCOORD.xy - (screen_size * 0.5);
    
    // 3. 逆向计算出该片段在游戏世界中的【绝对物理坐标】
    vec2 world_pos = (screen_pos_from_center / camera_zoom) + camera_offset;
    
    // 4. 网格间距按缩放阈值分档跳变，而不是随缩放连续变化。
    //    每降低一个 2 倍缩放档位，世界网格间距就增大一倍。
    float zoom_scale = max(min(camera_zoom.x, camera_zoom.y), 0.0001);
    float zoom_lod = max(0.0, ceil(-log(zoom_scale) / log(2.0)));
    float grid_size_multiplier = pow(2.0, zoom_lod);
    float effective_grid_size = grid_size * grid_size_multiplier;
    vec2 grid_pos = abs(mod(world_pos, effective_grid_size));
    
    // 5. 使用 fwidth 进行抗锯齿计算（防止 Camera 拉远缩放时线条产生锯齿或消失）
    vec2 deriv = fwidth(world_pos);
    vec2 target_thickness = line_thickness * deriv;
    
    vec2 line_alpha = smoothstep(target_thickness, vec2(0.0), grid_pos) + 
                       smoothstep(vec2(effective_grid_size) - target_thickness, vec2(effective_grid_size), grid_pos);
    
    float alpha = max(line_alpha.x, line_alpha.y);
    
    // 6. 输出最终背景与网格混合结果
    COLOR = mix(bg_color, grid_color, clamp(alpha, 0.0, 1.0));
}
