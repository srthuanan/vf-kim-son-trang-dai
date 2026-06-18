import os

filepath = 'src/components/OrdersPanel.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """                          <span>Hủy đơn</span>
                        </button>
                      </div>
                      </div>

                      <div className="orders-mobile-detail-shell" """

replacement = """                          <span>Hủy đơn</span>
                        </button>
                      </div>

                      <div className="orders-mobile-detail-shell" """

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success 1")
else:
    print("Failed 1")

# Add back the closing div at the end that I removed previously
target2 = """                            </div>
                          </div>
                        )}

                    </div>
                  );"""

replacement2 = """                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );"""

if target2 in content:
    content = content.replace(target2, replacement2)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success 2")
else:
    print("Failed 2")

