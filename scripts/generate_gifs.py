#!/usr/bin/env python3
"""
Finds moves in the shared Firestore library that have a Drive clip but no
GIF preview yet, downloads each clip, and converts it to a short looping
GIF in gifs/. Meant to run on a schedule via GitHub Actions so pasting a
new Drive link in the app gets an animated preview automatically, with no
manual step.
"""
import json
import os
import subprocess
import sys
import urllib.request

PROJECT_ID = "pjbachata"
STRUCTURE_URL = (
    f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}"
    "/databases/(default)/documents/library/structure"
)
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GIF_DIR = os.path.join(REPO_ROOT, "gifs")
TMP_DIR = "/tmp/gif_src"


def unwrap(v):
    if "stringValue" in v:
        return v["stringValue"]
    if "integerValue" in v:
        return int(v["integerValue"])
    if "booleanValue" in v:
        return v["booleanValue"]
    if "nullValue" in v:
        return None
    if "mapValue" in v:
        return {k: unwrap(val) for k, val in v["mapValue"].get("fields", {}).items()}
    if "arrayValue" in v:
        return [unwrap(x) for x in v["arrayValue"].get("values", [])]
    return v


def fetch_pairs():
    with urllib.request.urlopen(STRUCTURE_URL, timeout=30) as resp:
        data = json.load(resp)
    categories = unwrap(data["fields"]["categories"])
    pairs = []
    for cat in categories:
        for mv in cat.get("moves", []):
            if mv.get("driveId"):
                pairs.append((mv["id"], mv["driveId"]))
    return pairs


def main():
    os.makedirs(GIF_DIR, exist_ok=True)
    os.makedirs(TMP_DIR, exist_ok=True)

    pairs = fetch_pairs()
    existing = {f[:-4] for f in os.listdir(GIF_DIR) if f.endswith(".gif")}
    missing = [(mid, did) for mid, did in pairs if mid not in existing]

    if not missing:
        print("No new clips to convert.")
        return

    print(f"Found {len(missing)} new clip(s) to convert: {[m for m, _ in missing]}")
    made_any = False

    for mid, did in missing:
        src = os.path.join(TMP_DIR, f"{mid}.bin")
        gif = os.path.join(GIF_DIR, f"{mid}.gif")
        print(f"== {mid} ({did}) ==")

        dl = subprocess.run(
            ["curl", "-sL", "-o", src,
             f"https://drive.google.com/uc?export=download&id={did}"],
            stdin=subprocess.DEVNULL,
        )
        if dl.returncode != 0 or not os.path.exists(src):
            print("  FAILED to download")
            continue

        size = os.path.getsize(src)
        if size < 10000:
            print(f"  skip: downloaded file too small ({size} bytes)")
            os.remove(src)
            continue

        result = subprocess.run(
            [
                "ffmpeg", "-nostdin", "-y", "-i", src, "-t", "6",
                "-vf",
                "fps=6,scale=160:-2:flags=lanczos,split[s0][s1];"
                "[s0]palettegen=max_colors=40[p];[s1][p]paletteuse=dither=bayer",
                gif, "-loglevel", "error",
            ],
            stdin=subprocess.DEVNULL,
        )
        os.remove(src)

        if result.returncode == 0 and os.path.exists(gif):
            print(f"  gif size={os.path.getsize(gif)}")
            made_any = True
        else:
            print(f"  FAILED to convert {mid}")

    if made_any:
        # Signal to the workflow that there's something new to commit.
        gh_output = os.environ.get("GITHUB_OUTPUT")
        if gh_output:
            with open(gh_output, "a") as f:
                f.write("made_any=true\n")
    else:
        print("No GIFs were produced.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"generate_gifs failed: {e}", file=sys.stderr)
        sys.exit(1)
