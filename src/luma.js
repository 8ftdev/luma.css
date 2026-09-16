import { lighting, normalizeLight } from "./light.js";

const owners = new WeakSet();

/** One light source shared by every [data-luma] surface within the root container. */
export function createLuma({
	root = document,
	light = {},
	pointer = false,
} = {}) {
	const doc = root.ownerDocument || root;
	const win = doc.defaultView;
	const items = new Map();
	const motion = win.matchMedia("(prefers-reduced-motion: reduce)");
	let source = normalizeLight(light, { x: 0, y: 0, z: 240, intensity: 1 });
	let frame = 0,
		dirty = true,
		dead = false,
		cursor;

	function schedule() {
		if (!dead && !frame) frame = win.requestAnimationFrame(render);
	}
	function invalidate() {
		dirty = true;
		schedule();
	}
	const resize = new win.ResizeObserver(invalidate);
	const intersection = new win.IntersectionObserver((entries) => {
		for (const e of entries) {
			const item = items.get(e.target);
			if (item) item.visible = e.isIntersecting;
		}
		invalidate();
	});

	function render() {
		frame = 0;
		if (pointer && cursor && !motion.matches) {
			source = {
				...source,
				x: cursor.x + win.scrollX,
				y: cursor.y + win.scrollY,
			};
		}
		// Finish every geometry read before writing styles.
		if (dirty)
			for (const item of items.values()) {
				const r = item.effect.getBoundingClientRect();
				item.rect = {
					left: r.left + win.scrollX,
					top: r.top + win.scrollY,
					width: r.width,
					height: r.height,
				};
			}
		dirty = false;
		for (const [host, item] of items) {
			const { rect, effect } = item;
			const result = lighting(rect, source, host.dataset.luma);
			const { x, y, radius, gain } = result;
			const active =
				item.visible &&
				host.isConnected &&
				rect.width &&
				rect.height &&
				gain &&
				x > -radius &&
				y > -radius &&
				x < rect.width + radius &&
				y < rect.height + radius;
			const values = active
				? [x.toFixed(2), y.toFixed(2), radius, gain.toFixed(4)]
				: [];
			const key = values.join();
			if (key === item.last) continue;
			item.last = key;
			effect.style.opacity = active ? "1" : "0";
			if (active)
				["x", "y", "radius", "gain"].forEach((name, i) => {
					effect.style.setProperty(
						`--luma-${name}`,
						values[i] + (i < 3 ? "px" : ""),
					);
				});
		}
	}

	function remove(host, item) {
		resize.unobserve(host);
		intersection.unobserve(host);
		item.effect.remove();
		for (const name of item.classes) host.classList.remove(name);
		owners.delete(host);
		items.delete(host);
	}

	function refresh() {
		if (dead) return;
		const targets = new Set(root.querySelectorAll("[data-luma]"));
		if (root.matches?.("[data-luma]")) targets.add(root);
		for (const [host, item] of items)
			if (!targets.has(host)) remove(host, item);
		const additions = [];
		for (const host of targets)
			if (!items.has(host) && !owners.has(host)) {
				const classes = ["luma-host"];
				if (win.getComputedStyle(host).position === "static")
					classes.push("luma-positioned");
				additions.push([
					host,
					classes.filter((name) => !host.classList.contains(name)),
				]);
			}
		for (const [host, classes] of additions) {
			const effect = doc.createElement("span");
			effect.className = "luma-effect";
			effect.setAttribute("aria-hidden", "true");
			host.classList.add(...classes);
			host.prepend(effect);
			items.set(host, { effect, classes, visible: true });
			owners.add(host);
			resize.observe(host);
			intersection.observe(host);
		}
		invalidate();
	}

	function onPointer(e) {
		if (!pointer || motion.matches || e.pointerType === "touch") return;
		cursor = { x: e.clientX, y: e.clientY };
		schedule();
	}

	win.addEventListener("pointermove", onPointer, { passive: true });
	win.addEventListener("scroll", invalidate, true);
	win.addEventListener("resize", invalidate);
	motion.addEventListener("change", schedule);
	refresh();

	return {
		setLight(update) {
			if (!dead) {
				source = normalizeLight(update, source);
				schedule();
			}
		},
		followPointer(enabled = true) {
			pointer = !!enabled;
			cursor = undefined;
			schedule();
		},
		refresh,
		destroy() {
			if (dead) return;
			dead = true;
			win.cancelAnimationFrame(frame);
			win.removeEventListener("pointermove", onPointer);
			win.removeEventListener("scroll", invalidate, true);
			win.removeEventListener("resize", invalidate);
			motion.removeEventListener("change", schedule);
			for (const [host, item] of items) remove(host, item);
			resize.disconnect();
			intersection.disconnect();
		},
	};
}
