import os

filepath = 'src/components/OrdersPanel.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = "paddingTop: '16px', display: 'flex', gap: '8px'"
replacement = "paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px'"

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Failed to find target")
