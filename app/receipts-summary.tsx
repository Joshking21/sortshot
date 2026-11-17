import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { theme } from '../src/theme';
import { strings } from '../src/strings';
import { getEntitiesForShot, getShotsByCategory } from '../src/db/queries';
import { useProStore } from '../src/pro/pro';
import { Button, Card, EmptyState } from '../src/ui';

interface ReceiptTransaction {
  id: string;
  dateStr: string;
  timestamp: number;
  amount: number;
  formattedAmount: string;
  currency: string;
  direction: 'in' | 'out' | 'unknown';
  beneficiaryOrMerchant: string;
  reference: string;
  narration: string;
}

interface MonthlyGroup {
  monthKey: string;
  monthTitle: string;
  totalOut: number;
  totalIn: number;
  transactions: ReceiptTransaction[];
}

export default function ReceiptsSummaryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;
  const isPro = useProStore((state) => state.isPro);

  const [groups, setGroups] = useState<MonthlyGroup[]>([]);
  const [allTransactions, setAllTransactions] = useState<ReceiptTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const receiptShots = await getShotsByCategory('receipt', 500, 0);
      const txList: ReceiptTransaction[] = [];

      for (const shot of receiptShots) {
        const entities = await getEntitiesForShot(shot.id);
        const amountEnt = entities.find((e) => e.type === 'amount');
        const dateEnt = entities.find((e) => e.type === 'date');
        const text = shot.ocr_text || '';

        if (amountEnt) {
          const extra = amountEnt.extra ? JSON.parse(amountEnt.extra) : {};
          const amtVal = parseFloat(amountEnt.value) || 0;
          const currency = extra.currency || 'NGN';
          const direction = extra.direction || 'unknown';

          // Look for beneficiary / merchant in text
          const benMatch = text.match(/(?:beneficiary|merchant|paid to|sent to|from)\s*[:\-]?\s*([A-Za-z0-9\s.'-]+)/i);
          const refMatch = text.match(/(?:reference|ref|session id|transaction id)\s*[:\-]?\s*([A-Za-z0-9\-_]+)/i);
          const narMatch = text.match(/(?:narration|remarks|for)\s*[:\-]?\s*([A-Za-z0-9\s.'-]+)/i);

          const txDate = dateEnt ? new Date(dateEnt.value) : new Date(shot.created_at);
          const validTimestamp = isNaN(txDate.getTime()) ? shot.created_at : txDate.getTime();

          txList.push({
            id: shot.id,
            dateStr: new Date(validTimestamp).toLocaleDateString(),
            timestamp: validTimestamp,
            amount: amtVal,
            formattedAmount: amountEnt.label || `₦${amtVal.toLocaleString()}`,
            currency,
            direction,
            beneficiaryOrMerchant: benMatch ? benMatch[1].trim() : '—',
            reference: refMatch ? refMatch[1].trim() : '—',
            narration: narMatch ? narMatch[1].trim() : '—',
          });
        }
      }

      // Sort newest first
      txList.sort((a, b) => b.timestamp - a.timestamp);
      setAllTransactions(txList);

      // Group by YYYY-MM
      const groupMap = new Map<string, MonthlyGroup>();
      for (const tx of txList) {
        const d = new Date(tx.timestamp);
        const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthTitle = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const existing = groupMap.get(monthKey) || {
          monthKey,
          monthTitle,
          totalOut: 0,
          totalIn: 0,
          transactions: [],
        };

        if (tx.currency === 'NGN') {
          if (tx.direction === 'out') existing.totalOut += tx.amount;
          if (tx.direction === 'in') existing.totalIn += tx.amount;
        }
        existing.transactions.push(tx);
        groupMap.set(monthKey, existing);
      }

      setGroups(Array.from(groupMap.values()));
    } catch (err) {
      console.warn('[ReceiptsSummary] Failed to load receipt data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleExportCsv = async () => {
    if (!isPro) {
      router.push('/pro');
      return;
    }

    try {
      const headers = ['Date', 'Amount', 'Currency', 'Direction', 'Beneficiary/Merchant', 'Reference', 'Narration'];
      const rows = allTransactions.map((tx) => [
        `"${tx.dateStr}"`,
        tx.amount.toFixed(2),
        `"${tx.currency}"`,
        `"${tx.direction}"`,
        `"${tx.beneficiaryOrMerchant.replace(/"/g, '""')}"`,
        `"${tx.reference.replace(/"/g, '""')}"`,
        `"${tx.narration.replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const fileUri = `${FileSystem.cacheDirectory}Sortshot_Receipts_${Date.now()}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Receipts CSV',
        });
      } else {
        Alert.alert('Sharing Unavailable', 'Sharing is not supported on this platform.');
      }
    } catch (err) {
      console.error('[Receipts] Failed to export CSV:', err);
      Alert.alert('Error', 'Failed to generate CSV export.');
    }
  };

  const handleExportPdf = async () => {
    if (!isPro) {
      router.push('/pro');
      return;
    }

    try {
      const rowsHtml = allTransactions
        .map(
          (tx) => `
        <tr>
          <td>${tx.dateStr}</td>
          <td>${tx.beneficiaryOrMerchant}</td>
          <td>${tx.reference}</td>
          <td style="color: ${tx.direction === 'out' ? '#DC2626' : '#059669'}; font-weight: bold;">
            ${tx.formattedAmount} (${tx.direction})
          </td>
        </tr>`
        )
        .join('');

      const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Sortshot Receipts Summary</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #18181B; }
            h1 { color: #6D28D9; margin-bottom: 4px; }
            p { color: #71717A; margin-top: 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th, td { border: 1px solid #E4E4E7; padding: 8px 12px; text-align: left; }
            th { background-color: #EDE9FE; color: #6D28D9; }
            tr:nth-child(even) { background-color: #FAFAFA; }
          </style>
        </head>
        <body>
          <h1>Sortshot Receipts & Transfers Summary</h1>
          <p>Generated on ${new Date().toLocaleDateString()} from your on-device screenshots.</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Beneficiary / Merchant</th>
                <th>Reference</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>`;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Receipts PDF',
        });
      }
    } catch (err) {
      console.error('[Receipts] Failed to export PDF:', err);
      Alert.alert('Error', 'Failed to generate PDF export.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      {/* Export Action Bar */}
      <View style={[styles.exportBar, { backgroundColor: currentTheme.card, borderColor: currentTheme.line }]}>
        <View style={styles.exportBarLeft}>
          <Text style={[styles.exportTitle, { color: currentTheme.ink }]}>
            {strings.receipts.exportTitle}
          </Text>
          <Text style={[styles.exportSubtitle, { color: currentTheme.muted }]}>
            {isPro ? 'Sortshot Pro Active' : 'Pro Feature: Export to CSV or PDF'}
          </Text>
        </View>

        <View style={styles.exportBtnRow}>
          <Button
            title={strings.receipts.exportCsv}
            size="sm"
            variant="secondary"
            onPress={handleExportCsv}
          />
          <Button
            title={strings.receipts.exportPdf}
            size="sm"
            onPress={handleExportPdf}
          />
        </View>
      </View>

      {/* Monthly Breakdown List */}
      {groups.length === 0 && !loading ? (
        <EmptyState
          icon="🧾"
          title="No receipts found"
          subtitle="Screenshots with transaction amounts and transfer details will be aggregated here."
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.monthKey}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.monthCard}>
              <View style={styles.monthHeader}>
                <Text style={[styles.monthTitle, { color: currentTheme.ink }]}>
                  {item.monthTitle}
                </Text>
                <View style={styles.monthTotals}>
                  <Text style={[styles.monthOut, { color: currentTheme.danger }]}>
                    -₦{item.totalOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.monthIn, { color: currentTheme.success }]}>
                    +₦{item.totalIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              <View style={styles.txList}>
                {item.transactions.map((tx) => (
                  <View key={tx.id} style={[styles.txItem, { borderBottomColor: currentTheme.line }]}>
                    <View style={styles.txLeft}>
                      <Text style={[styles.txBeneficiary, { color: currentTheme.ink }]} numberOfLines={1}>
                        {tx.beneficiaryOrMerchant}
                      </Text>
                      <Text style={[styles.txDate, { color: currentTheme.muted }]}>
                        {tx.dateStr} · {tx.reference}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: tx.direction === 'out' ? currentTheme.danger : currentTheme.success },
                      ]}
                    >
                      {tx.direction === 'out' ? '-' : '+'}{tx.formattedAmount}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  exportBar: {
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exportBarLeft: {
    flex: 1,
    marginRight: 8,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  exportSubtitle: {
    fontSize: 12,
  },
  exportBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  listContent: {
    padding: theme.spacing[4],
    gap: 16,
  },
  monthCard: {
    padding: theme.spacing[4],
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
    paddingBottom: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthTotals: {
    alignItems: 'flex-end',
  },
  monthOut: {
    fontSize: 13,
    fontWeight: '700',
  },
  monthIn: {
    fontSize: 13,
    fontWeight: '700',
  },
  txList: {
    gap: 10,
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txLeft: {
    flex: 1,
    marginRight: 10,
  },
  txBeneficiary: {
    fontSize: 14,
    fontWeight: '600',
  },
  txDate: {
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
