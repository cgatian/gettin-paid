/**
 * Full-viewport confetti falling from the top (celebration after recording a sale).
 * Canvas-only; no external deps. Skipped when prefers-reduced-motion is set.
 */
export function playSaleSavedConfetti(): void {
	if (typeof window === "undefined" || typeof document === "undefined") return;
	if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

	const canvas = document.createElement("canvas");
	canvas.setAttribute("aria-hidden", "true");
	canvas.style.cssText =
		"position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10050";
	document.body.appendChild(canvas);

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		canvas.remove();
		return;
	}

	const colors = [
		"#853BCE",
		"#42946E",
		"#FFD700",
		"#e8e8ef",
		"#58a6ff",
		"#c0392b",
	];

	type Piece = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		rot: number;
		vr: number;
		w: number;
		h: number;
		color: string;
	};

	let width = window.innerWidth;
	let height = window.innerHeight;
	const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

	function syncSize() {
		width = window.innerWidth;
		height = window.innerHeight;
		canvas.width = Math.floor(width * dpr);
		canvas.height = Math.floor(height * dpr);
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	syncSize();

	const pieces: Piece[] = [];
	const count = Math.min(220, Math.floor(width / 4) + 120);
	for (let i = 0; i < count; i++) {
		pieces.push({
			x: Math.random() * width,
			y: -24 - Math.random() * height * 0.35,
			vx: (Math.random() - 0.5) * 5,
			vy: 1.5 + Math.random() * 4,
			rot: Math.random() * Math.PI * 2,
			vr: (Math.random() - 0.5) * 0.2,
			w: 5 + Math.random() * 9,
			h: 3 + Math.random() * 7,
			color: colors[i % colors.length] ?? "#853BCE",
		});
	}

	let frames = 0;
	const maxFrames = 300;

	const onResize = () => syncSize();
	window.addEventListener("resize", onResize);

	function tick() {
		frames++;
		ctx.clearRect(0, 0, width, height);

		for (const p of pieces) {
			p.y += p.vy;
			p.x += p.vx + Math.sin(frames * 0.03 + p.rot) * 0.35;
			p.vy += 0.11;
			p.rot += p.vr;

			if (p.y < -40 || p.y > height + 80) continue;

			const fade =
				p.y > height * 0.75
					? Math.max(0, 1 - (p.y - height * 0.75) / (height * 0.35))
					: 1;

			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(p.rot);
			ctx.globalAlpha = fade;
			ctx.fillStyle = p.color;
			ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
			ctx.restore();
		}

		ctx.globalAlpha = 1;

		if (frames < maxFrames) {
			requestAnimationFrame(tick);
		} else {
			window.removeEventListener("resize", onResize);
			canvas.remove();
		}
	}

	requestAnimationFrame(tick);
}
