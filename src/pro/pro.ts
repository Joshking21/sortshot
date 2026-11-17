import { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { create } from 'zustand';

// Default RevenueCat Public API Keys (Configure with live keys in EAS / production)
const REVENUECAT_APPLE_KEY = 'appl_mock_sortshot_test_key';
const REVENUECAT_GOOGLE_KEY = 'goog_mock_sortshot_test_key';

export const PRO_ENTITLEMENT_ID = 'pro';

interface ProStoreState {
  isPro: boolean;
  loading: boolean;
  currentOffering: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  setIsPro: (isPro: boolean) => void;
  setLoading: (loading: boolean) => void;
  setCurrentOffering: (offering: PurchasesOffering | null) => void;
  setCustomerInfo: (info: CustomerInfo | null) => void;
}

export const useProStore = create<ProStoreState>((set) => ({
  isPro: false,
  loading: true,
  currentOffering: null,
  customerInfo: null,
  setIsPro: (isPro) => set({ isPro }),
  setLoading: (loading) => set({ loading }),
  setCurrentOffering: (currentOffering) => set({ currentOffering }),
  setCustomerInfo: (customerInfo) => set({ customerInfo }),
}));

let isPurchasesConfigured = false;

export async function initPurchases(): Promise<void> {
  if (isPurchasesConfigured || Platform.OS === 'web') return;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;

  try {
    Purchases.configure({ apiKey });
    isPurchasesConfigured = true;

    // Check initial customer info
    const info = await Purchases.getCustomerInfo();
    const hasPro = info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
    useProStore.getState().setIsPro(hasPro);
    useProStore.getState().setCustomerInfo(info);

    // Listen for customer info updates
    Purchases.addCustomerInfoUpdateListener((updatedInfo) => {
      const active = updatedInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
      useProStore.getState().setIsPro(active);
      useProStore.getState().setCustomerInfo(updatedInfo);
    });

    // Fetch offerings
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      useProStore.getState().setCurrentOffering(offerings.current);
    }
  } catch (err) {
    console.warn('[Purchases] Initialization warning (expected in mock/dev client):', err);
  } finally {
    useProStore.getState().setLoading(false);
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const hasPro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
    useProStore.getState().setIsPro(hasPro);
    useProStore.getState().setCustomerInfo(customerInfo);
    return hasPro;
  } catch (err: any) {
    if (!err.userCancelled) {
      console.warn('[Purchases] Purchase failed:', err);
    }
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasPro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
    useProStore.getState().setIsPro(hasPro);
    useProStore.getState().setCustomerInfo(customerInfo);
    return hasPro;
  } catch (err) {
    console.warn('[Purchases] Restore failed:', err);
    return false;
  }
}

export function usePro() {
  const { isPro, loading, currentOffering, customerInfo } = useProStore();

  useEffect(() => {
    if (!isPurchasesConfigured) {
      initPurchases();
    }
  }, []);

  return {
    isPro,
    loading,
    currentOffering,
    customerInfo,
    purchasePackage,
    restorePurchases,
  };
}
