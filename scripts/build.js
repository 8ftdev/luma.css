await Bun.$`mkdir -p dist`;

async function bundle(entrypoint, output) {
	const result = await Bun.build({
		entrypoints: [entrypoint],
		target: "browser",
		format: "esm",
		minify: true,
	});
	if (!result.success)
		throw new AggregateError(result.logs, `Failed to build ${entrypoint}`);
	await Bun.write(output, result.outputs[0]);
}

await Promise.all([
	bundle("src/luma.js", "dist/luma.js"),
	bundle("src/luma.css", "dist/luma.css"),
]);

const sizes = {};
for (const res of result.outputs) {
	const data = new Uint8Array(await Bun.file("dist/" + res.path).arrayBuffer());
	sizes[file] = {
		minified: data.byteLength,
		gzip: Bun.gzipSync(data, { level: 9 }).byteLength,
	};
}
sizes.total = {
	minified: Object.values(sizes).reduce((s, x) => s + x.minified, 0),
	gzip: Object.values(sizes).reduce((s, x) => s + x.gzip, 0),
};
await Bun.write("dist/size.json", JSON.stringify(sizes, null, 2) + "\n");
if (sizes.total.gzip > 2560)
	throw Error("Combined gzip exceeds the 2.5 KiB ceiling");
