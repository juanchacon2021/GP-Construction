from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]  # .../SITIO
ASSETS_IMG_DIR = ROOT / "assets" / "img"
OUTPUT_DIR = ROOT / "assets" / "opt" / "w"


def resize_webp(input_path: Path, output_path: Path, *, width: int, quality: int = 74) -> None:
	output_path.parent.mkdir(parents=True, exist_ok=True)
	with Image.open(input_path) as img:
		if img.mode not in ("RGB", "RGBA"):
			img = img.convert("RGBA" if "A" in img.getbands() else "RGB")

		# Mantener proporción
		w, h = img.size
		if w <= width:
			# Si ya es pequeña, igual guardamos una copia optimizada.
			new_img = img
		else:
			new_h = max(1, round(h * (width / w)))
			new_img = img.resize((width, new_h), Image.Resampling.LANCZOS)

		new_img.save(
			output_path,
			format="WEBP",
			quality=quality,
			method=6,
			optimize=True,
		)


def out_path_for(input_path: Path, *, width: int) -> Path:
	rel = input_path.relative_to(ASSETS_IMG_DIR)
	# nombre-360.webp
	return OUTPUT_DIR / rel.with_name(f"{rel.stem}-{width}{rel.suffix}")


def main(argv: list[str]) -> int:
	# Uso:
	#   python tools/resize_webp_variants.py 360 assets/img/rueda7.webp assets/img/rueda8.webp
	#   python tools/resize_webp_variants.py 960 assets/img/services.webp
	if len(argv) < 2:
		print("Uso: resize_webp_variants.py <width> <paths...>")
		return 2

	try:
		width = int(argv[0])
	except ValueError:
		print("Width inválido")
		return 2

	paths = [Path(p) for p in argv[1:]]
	converted = 0
	errors = 0

	for p in paths:
		full = (ROOT / p) if not p.is_absolute() else p
		try:
			if not full.exists():
				print(f"No existe: {full}")
				errors += 1
				continue
			if full.suffix.lower() != ".webp":
				print(f"Saltando (no webp): {full}")
				continue

			out = out_path_for(full, width=width)
			# Skip si ya está actualizado
			if out.exists() and out.stat().st_mtime >= full.stat().st_mtime:
				continue

			resize_webp(full, out, width=width)
			converted += 1
		except Exception as exc:  # noqa: BLE001
			print(f"ERROR: {full} -> {exc}")
			errors += 1

	print(f"Hecho. Convertidas: {converted}. Errores: {errors}. Salida: {OUTPUT_DIR}")
	return 0 if errors == 0 else 1


if __name__ == "__main__":
	raise SystemExit(main(sys.argv[1:]))
