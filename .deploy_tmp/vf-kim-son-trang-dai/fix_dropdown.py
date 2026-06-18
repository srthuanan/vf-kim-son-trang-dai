import os

filepath = 'src/components/InlineOrderEditForm.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = "                  <select className=\"seamless-select\" value={staff} onChange={(e) => setStaff(e.target.value)} required>\n                    {staffNames.map((n) => <option key={n} value={n}>{n}</option>)}\n                  </select>"

replacement = """                  <select className="seamless-select" value={staff} onChange={(e) => setStaff(e.target.value)} required>
                    {(() => {
                      const list = [...staffNames];
                      if (staff && !list.includes(staff)) list.unshift(staff);
                      return list.map(n => <option key={n} value={n}>{n}</option>);
                    })()}
                  </select>"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success replacing InlineOrderEditForm")
else:
    print("Failed to find target in InlineOrderEditForm")

