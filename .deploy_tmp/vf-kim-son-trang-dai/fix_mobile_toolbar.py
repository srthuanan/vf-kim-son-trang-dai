import os

filepath = 'src/components/OrdersPanel.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """                        <button
                          type="button"
                          className="ghost-button orders-mobile-back"
                          onClick={() => { setMobileView('list'); setIsDetailPanelOpen(false); }}
                          style={{ flex: '0 0 auto', height: '32px', padding: '0 10px', fontSize: '12px' }}
                        >
                          <ArrowLeft size={14} />
                          <span>Danh sách</span>
                        </button>
                      <div className="orders-detail-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>"""

replacement = """                        <button
                          type="button"
                          className="ghost-button orders-mobile-back"
                          onClick={() => { setMobileView('list'); setIsDetailPanelOpen(false); }}
                          style={{ flex: '0 0 auto', height: '32px', padding: '0 10px', fontSize: '12px' }}
                        >
                          <ArrowLeft size={14} />
                          <span>Danh sách</span>
                        </button>
                      </div>
                      <div className="orders-detail-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success 1")
else:
    print("Failed 1")

# Also need to remove one trailing </div> at the end of the mobile block
target2 = """                          </div>
                        )}

                      </div>
                    </div>
                  );"""

replacement2 = """                          </div>
                        )}

                    </div>
                  );"""

if target2 in content:
    content = content.replace(target2, replacement2)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success 2")
else:
    print("Failed 2")

