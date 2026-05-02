from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]  # .../SITIO
ASSETS_IMG_DIR = ROOT / "assets" / "img"
OUTPUT_IMG_DIR = ROOT / "assets" / "opt" / "img"


@dataclass(frozen=True)
class OptimizeStats:
	converted: int = 0
	skipped: int = 0
	errors: int = 0


def _extract_asset_paths(text: str) -> set[str]:
	"""Extrae rutas tipo assets/img/...(.png|.jpg|.jpeg) de HTML/CSS."""
	# CSS puede tener espacios escapados con backslash (\ )
	# HTML suele tener rutas dentro de comillas.
	patterns = [
		re.compile(r"assets/img/[^'\"]+\.(?:png|jpe?g)", re.IGNORECASE),
		re.compile(r"url\(\s*(?:'|\")?(assets/img/[^)'\"]+\.(?:png|jpe?g))(?:'|\")?\s*\)", re.IGNORECASE),
	]

	paths: set[str] = set()
	for pat in patterns:
		for match in pat.findall(text):
			if isinstance(match, tuple):
				paths.add(match[0])
			else:
				paths.add(match)
	# Normalizar escapes CSS: "fondo\ plano.png" -> "fondo plano.png"
	normalized: set[str] = set()
	for p in paths:
		normalized.add(p.replace("\\ ", " "))
	return normalized


def discover_inputs() -> list[Path]:
	candidate_files = list(ROOT.rglob("*.html")) + list(ROOT.rglob("*.css"))
	asset_rel_paths: set[str] = set()
	for file_path in candidate_files:
		try:
			text = file_path.read_text(encoding="utf-8", errors="ignore")
		except OSError:
			continue
		asset_rel_paths |= _extract_asset_paths(text)

	inputs: list[Path] = []
	for rel in sorted(asset_rel_paths):
		full = ROOT / rel
		if full.exists() and full.is_file():
			inputs.append(full)
	return inputs


def to_output_path(input_path: Path) -> Path:
	rel = input_path.relative_to(ASSETS_IMG_DIR)
	out_rel = rel.with_suffix(".webp")
	return OUTPUT_IMG_DIR / out_rel


def convert_to_webp(input_path: Path, output_path: Path, *, quality: int = 78) -> None:
	output_path.parent.mkdir(parents=True, exist_ok=True)

	with Image.open(input_path) as img:
		# Convertir a modo compatible con WebP
		if img.mode not in ("RGB", "RGBA"):
			img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
		elif img.mode == "P":
			img = img.convert("RGBA")

		img.save(
			output_path,
			format="WEBP",
			quality=quality,
			method=6,
			optimize=True,
		)


def main(argv: list[str]) -> int:
	# Opcional: permitir optimizar todo el árbol assets/img (no recomendado por defecto)
	opt_all = "--all" in argv

	if not ASSETS_IMG_DIR.exists():
		print(f"No existe: {ASSETS_IMG_DIR}")
		return 2

	if opt_all:
		inputs = [p for p in ASSETS_IMG_DIR.rglob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg")]
	else:
		inputs = discover_inputs()

	if not inputs:
		print("No encontré imágenes PNG/JPG referenciadas en HTML/CSS.")
		return 0

	stats = OptimizeStats()
	converted = skipped = errors = 0

	for input_path in inputs:
		try:
			out_path = to_output_path(input_path)

			# Skip si ya existe y es más nuevo
			if out_path.exists() and out_path.stat().st_mtime >= input_path.stat().st_mtime:
				skipped += 1
				continue

			convert_to_webp(input_path, out_path)
			converted += 1
		except Exception as exc:  # noqa: BLE001
			errors += 1
			print(f"ERROR: {input_path} -> {exc}")

	print("Hecho.")
	print(f"- Convertidas: {converted}")
	print(f"- Omitidas (ya estaban): {skipped}")
	print(f"- Errores: {errors}")
	print(f"Salida: {OUTPUT_IMG_DIR}")

	return 0 if errors == 0 else 1


if __name__ == "__main__":
	raise SystemExit(main(sys.argv[1:]))
