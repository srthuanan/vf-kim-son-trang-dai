import os

filepath = 'src/components/OrdersPanel.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
for i, line in enumerate(lines):
    if "if (isMobile) {" in line and "const selectedFinishSummary =" in lines[i-2]:
        start_idx = i
        break

end_idx = -1
if start_idx != -1:
    # find the matching return ( for the non-mobile view
    for i in range(start_idx, len(lines)):
        if "return (" in lines[i] and "<>" in lines[i+1]:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    new_lines = lines[:start_idx] + lines[end_idx:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"Removed lines {start_idx} to {end_idx-1}")
else:
    print(f"Failed to find block: start={start_idx}, end={end_idx}")

