shader_type canvas_item;
uniform float progress : hint_range(0.0, 1.0) = 1.0;
uniform bool reverse = false;
void fragment() {
	float along = reverse ? 1.0 - UV.x : UV.x;
	COLOR.a *= 1.0 - smoothstep(max(0.0, progress - 0.025), progress + 0.001, along);
}
