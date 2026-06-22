import { getSalesPolicies } from '../services/apiService';
import { SalesPolicyRow } from '../types';

let cachedPolicyNames: string[] = [];

export const getPolicyNames = async (): Promise<string[]> => {
  if (cachedPolicyNames.length > 0) return cachedPolicyNames;
  const { data } = await getSalesPolicies();
  if (data) {
    cachedPolicyNames = data.map((p: SalesPolicyRow) => p.ten_chinh_sach).sort((a: string, b: string) => b.length - a.length);
  }
  return cachedPolicyNames;
};

export const parseSmartPolicy = (policyString: string, knownPolicies: string[]): string[] => {
  if (!policyString) return [];
  
  if (policyString.includes(';')) {
    return policyString.split(';').map(p => p.trim()).filter(Boolean);
  }
  
  if (knownPolicies.length === 0) {
    return [policyString.trim()];
  }
  
  let remaining = policyString;
  const found: string[] = [];
  
  for (const pName of knownPolicies) {
    if (remaining.includes(pName)) {
      found.push(pName);
      remaining = remaining.replace(pName, '');
    }
  }
  
  if (found.length > 0) {
    found.sort((a, b) => policyString.indexOf(a) - policyString.indexOf(b));
    return found;
  }
  
  return [policyString.trim()];
};
