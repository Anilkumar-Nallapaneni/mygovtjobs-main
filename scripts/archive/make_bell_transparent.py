from PIL import Image


def main() -> None:
    inp = r"E:\mygovtjobs\frontend\public\images\alerts-bell.png"
    out = r"E:\mygovtjobs\frontend\public\images\alerts-bell-transparent.png"

    img = Image.open(inp).convert("RGBA")
    pix = img.load()
    width, height = img.size

    # Remove near-white background pixels (keeps the orange bell).
    # Tune threshold if you still see some background.
    th = 245
    for y in range(height):
        for x in range(width):
            r, g, b, a = pix[x, y]
            if a == 0:
                continue
            if r >= th and g >= th and b >= th:
                pix[x, y] = (r, g, b, 0)
            elif r >= 250 and g >= 250 and b >= 250:
                # Extra safety for anti-aliased edges
                pix[x, y] = (r, g, b, 0)

    img.save(out, "PNG")
    print(f"Saved: {out} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()

