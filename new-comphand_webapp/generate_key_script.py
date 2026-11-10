import json
import os
import binascii
import re

key_file = "master_keys.json"
with open(key_file, "r") as f:
    content = f.read()

# Remove trailing commas that might occur if a programmer manually hard deletes a key
content = re.sub(r',\s*}', '}', content)

try:
    keys = json.loads(content)
except json.JSONDecodeError:
    keys = {} # Fallback to empty if still invalid

# Get the highest key ID and add 1. If no keys exist, start at 1.
new_key_id = str(max([int(k) for k in keys.keys()], default=0) + 1)
new_key_value = binascii.hexlify(os.urandom(32)).decode('ascii')

keys[new_key_id] = new_key_value

with open(key_file, "w") as f:
    json.dump(keys, f, indent=2)

print(f"Added new key {new_key_id} to {key_file}")