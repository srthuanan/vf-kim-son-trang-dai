import os

filepath = 'src/components/OrdersPanel.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = "                          <table style={{ width: '100%', height: '100%', flex: 1, borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #cbd5e1' }}>"
replacement = "                          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>\n                            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #cbd5e1' }}>"

if target in content:
    content = content.replace(target, replacement)
    
    target2 = "                          </table>\n\n                          <div style={{ paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>"
    replacement2 = "                          </table>\n                          </div>\n\n                          <div style={{ paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>"
    content = content.replace(target2, replacement2)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Failed to find target")
