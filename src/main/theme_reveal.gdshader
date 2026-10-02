shader_type canvas_item;
render_mode unshaded;

uniform vec2 viewport_size = vec2(1152.0, 648.0);
// 主题按钮始终显示实时控件，避免截图冻结按下状态。
uniform vec4 live_control_rect = vec4(0.0);
uniform float feather = 2.0;
uniform float base_new = 0.0;
uniform int wave_count = 0;
// xy: 点击位置，z: 半径，w: 目标为新配色(1)或旧配色(0)。
uniform vec4 waves[32];

void fragment() {
	vec4 previous = texture(TEXTURE, UV);
	vec2 point = UV * viewport_size;
	float new_color = base_new;
	for (int i = 0; i < wave_count; i++) {
		float inside = 1.0 - smoothstep(waves[i].z - feather, waves[i].z + feather, distance(point, waves[i].xy));
		new_color = mix(new_color, waves[i].w, inside);
	}
	// 新配色使用下方实时 UI，旧配色使用本轮共享的 GPU 截图。
	float keep_live = 0.0;
	if (live_control_rect.z > 0.0 && live_control_rect.w > 0.0) {
		vec2 local = point - live_control_rect.xy;
		keep_live = step(0.0, local.x) * step(0.0, local.y) * (1.0 - step(live_control_rect.z, local.x)) * (1.0 - step(live_control_rect.w, local.y));
	}
	COLOR = vec4(previous.rgb, previous.a * (1.0 - new_color) * (1.0 - keep_live));
}
