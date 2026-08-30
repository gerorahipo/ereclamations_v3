import json, base64, re, sys, os

result_file = sys.argv[1]
out_path = sys.argv[2]

with open(result_file, encoding='utf-8') as f:
    data = json.load(f)
text = data[0]['text']
m = re.search(r'data:image/png;base64,(.*)', text, re.S)
b64 = m.group(1)
b64 = re.sub(r'[^A-Za-z0-9+/=]', '', b64)
raw = base64.b64decode(b64)
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, 'wb') as f:
    f.write(raw)
print(f"{out_path}: {len(raw)} bytes")
