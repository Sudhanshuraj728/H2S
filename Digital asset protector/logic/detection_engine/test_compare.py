"""Quick test: run compare on the bhubhaneswar file itself (should be 100% identical)."""
import json, subprocess, sys

result = subprocess.run(
    [r"C:\Users\praty\Hack2Skill\H2S\Digital asset protector\logic\venv\Scripts\python.exe",
     "run_compare.py",
     r"uploads\69ef9bbfa1b99fc5db5d3054_1777310650703_bhubhaneswar.jpeg"],
    capture_output=True, text=True, cwd="."
)

data = json.loads(result.stdout)
bm = data.get("best_match", {})
print(f"Best match : {bm.get('matched_filename')}")
print(f"Score      : {bm.get('combined_similarity_percentage')}%")
print(f"Status     : {bm.get('match_status')}")

print("\nAll matches:")
for m in data.get("matches", []):
    print(f"  {m['matched_filename'][:40]:40s} | {m['combined_similarity_percentage']:6.2f}% | {m['match_status']}")
