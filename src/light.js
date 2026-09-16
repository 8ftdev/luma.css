export function normalizeLight(update, previous) {
	const next = { ...previous, ...update };
	for (const key of ["x", "y", "z", "intensity"]) {
		if (
			!Number.isFinite(next[key]) ||
			(key === "z" && next[key] <= 0) ||
			(key === "intensity" && next[key] < 0)
		) {
			throw new RangeError(`Invalid light ${key}`);
		}
	}
	return next;
}

// Deliberately artistic: depth increases gain, never changes light direction.
// Realistic light emulation was never the goal here.
export function lighting(rect, light, elevation) {
	const radius = Math.max(40, Math.min(1600, light.z));
	const level = Math.max(0, Math.min(8, +elevation || 0));
	return {
		x: light.x - rect.left,
		y: light.y - rect.top,
		radius,
		gain: Math.min(
			3,
			light.intensity * (1 + level * 0.25) * Math.min(2, (240 / radius) ** 2),
		),
	};
}
