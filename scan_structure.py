import os
import ast
import json

SHALLOW_FOLDERS = {"node_modules", "Scripts", "venv", "__pycache__"}
OUTPUT_FILE = "folder structure.txt"
lines = []  # collected lines to write to output file


def extract_comment(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            if file_path.endswith(".py"):
                tree = ast.parse(f.read())
                docstring = ast.get_docstring(tree)
                return docstring.strip().split('\n')[0] if docstring else None
            elif file_path.endswith((".js", ".ts", ".jsx", ".tsx", ".json", ".md")):
                first_line = f.readline().strip()
                if first_line.startswith(("//", "/*", "#")):
                    return first_line.lstrip("/#* ").strip()
                elif file_path.endswith(".json"):
                    data = json.load(f)
                    return data.get("description") or None
        return None
    except (SyntaxError, UnicodeDecodeError, json.JSONDecodeError):
        return None


def scan_dir(root, prefix="", is_shallow=False):
    try:
        entries = sorted(os.listdir(root))
    except (PermissionError, FileNotFoundError):
        return

    for i, entry in enumerate(entries):
        full_path = os.path.join(root, entry)
        is_last = i == len(entries) - 1
        connector = "└── " if is_last else "├── "

        if os.path.isdir(full_path):
            lines.append(f"{prefix}{connector}{entry}/")
            new_prefix = prefix + ("    " if is_last else "│   ")

            if entry in SHALLOW_FOLDERS or is_shallow:
                try:
                    sub_entries = sorted(os.listdir(full_path))
                    for j, sub in enumerate(sub_entries):
                        is_last_sub = j == len(sub_entries) - 1
                        sub_connector = "└── " if is_last_sub else "├── "
                        lines.append(f"{new_prefix}{sub_connector}{sub}/")
                except (PermissionError, FileNotFoundError):
                    continue
            else:
                scan_dir(full_path, new_prefix, is_shallow=(entry in SHALLOW_FOLDERS))
        else:
            comment = extract_comment(full_path)
            comment_text = f"  # {comment}" if comment else ""
            lines.append(f"{prefix}{connector}{entry}{comment_text}")


if __name__ == "__main__":
    script_location = os.path.dirname(os.path.abspath(__file__))
    folder_name = os.path.basename(script_location)
    header = f"📁 Folder structure for: {folder_name}\n"
    lines.append(header)
    scan_dir(script_location)

    output_path = os.path.join(script_location, OUTPUT_FILE)
    with open(output_path, "w", encoding="utf-8") as out:
        out.write("\n".join(lines))

    print(f"✅ Folder structure saved to: {OUTPUT_FILE}")
