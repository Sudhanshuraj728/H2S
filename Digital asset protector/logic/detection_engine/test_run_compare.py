import json
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__)))
from run_compare import compare_image

def main():
    file_path = r"D:\Desktop\H2S\Digital asset protector\database\images\Ben_Stokes\Ben_Stokes_batting_0.jpg"
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    result = compare_image(file_path)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
