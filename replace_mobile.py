import os

filepath = 'src/components/OrdersPanel.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """                              </div>
                            ) : null}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                }"""

replacement = """                              </div>
                            ) : null}
                          </div>
                        </div>

                        {selectedOrder.policy && (
                          <div className="orders-mobile-detail-section" style={{ paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', letterSpacing: '0.04em' }}>
                              <Info size={14} />
                              <span>Chính sách bán hàng</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {(() => {
                                const policies = parseSmartPolicy(selectedOrder.policy, knownPolicies);
                                if (policies.length === 0) return <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>Mặc định</span>;
                                return (
                                  <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {policies.map((p, i) => (
                                      <li key={i} style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500, lineHeight: 1.35 }}>{p}</li>
                                    ))}
                                  </ul>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                }"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Failed to find target")
