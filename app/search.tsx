import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { strings } from '../src/strings';
import { CategoryId, ShotRow } from '../src/db/schema';
import { getSetting, searchShots, setSetting } from '../src/db/queries';
import { Chip, EmptyState, Thumb } from '../src/ui';

const RECENT_SEARCHES_KEY = 'recent_searches_list';

const FILTER_CATEGORIES: Array<{ id: CategoryId | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'bank_details', label: strings.folders.bank_details },
  { id: 'receipt', label: strings.folders.receipt },
  { id: 'chat', label: strings.folders.chat },
  { id: 'event', label: strings.folders.event },
  { id: 'address', label: strings.folders.address },
  { id: 'link', label: strings.folders.link },
  { id: 'code', label: strings.folders.code },
  { id: 'id_document', label: strings.folders.id_document },
  { id: 'shopping', label: strings.folders.shopping },
  { id: 'other', label: strings.folders.other },
  { id: 'little_text', label: strings.folders.little_text },
];

export default function SearchScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [results, setResults] = useState<ShotRow[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Load recent searches from settings table
  useEffect(() => {
    async function loadRecents() {
      try {
        const raw = await getSetting(RECENT_SEARCHES_KEY);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) setRecentSearches(list);
        }
      } catch (err) {
        console.warn('Failed to load recent searches', err);
      }
    }
    loadRecents();
  }, []);

  const saveRecentSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
    setRecentSearches(next);
    await setSetting(RECENT_SEARCHES_KEY, JSON.stringify(next));
  };

  const handleClearRecents = async () => {
    setRecentSearches([]);
    await setSetting(RECENT_SEARCHES_KEY, JSON.stringify([]));
  };

  const performSearch = useCallback(
    async (textToSearch: string, category: CategoryId | 'all') => {
      const trimmed = textToSearch.trim();
      if (!trimmed) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setHasSearched(true);
      const catFilter = category === 'all' ? undefined : category;
      try {
        const matches = await searchShots(trimmed, catFilter);
        setResults(matches);
      } catch (err) {
        console.warn('Search query error', err);
      }
    },
    []
  );

  const handleSubmit = () => {
    if (query.trim()) {
      saveRecentSearch(query);
      performSearch(query, selectedCategory);
    }
  };

  const handleSelectRecent = (term: string) => {
    setQuery(term);
    performSearch(term, selectedCategory);
  };

  const handleCategoryChange = (cat: CategoryId | 'all') => {
    setSelectedCategory(cat);
    if (query.trim()) {
      performSearch(query, cat);
    }
  };

  const getHighlightSnippet = (ocrText: string | null, term: string): string => {
    if (!ocrText || !term) return '';
    const lower = ocrText.toLowerCase();
    const idx = lower.indexOf(term.toLowerCase());
    if (idx === -1) {
      return ocrText.slice(0, 100);
    }
    const start = Math.max(0, idx - 40);
    const end = Math.min(ocrText.length, idx + term.length + 60);
    return (start > 0 ? '…' : '') + ocrText.slice(start, end).replace(/\s+/g, ' ') + (end < ocrText.length ? '…' : '');
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      {/* Search Input Box */}
      <View style={[styles.searchBox, { backgroundColor: currentTheme.card, borderColor: currentTheme.line }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            performSearch(text, selectedCategory);
          }}
          onSubmitEditing={handleSubmit}
          placeholder={strings.home.searchPlaceholder}
          placeholderTextColor={currentTheme.muted}
          returnKeyType="search"
          autoFocus
          style={[styles.input, { color: currentTheme.ink }]}
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery('');
              setResults([]);
              setHasSearched(false);
            }}
          >
            <Text style={[styles.clearBtn, { color: currentTheme.muted }]}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Category Filter Chips */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_CATEGORIES.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.label}
              selected={selectedCategory === cat.id}
              onPress={() => handleCategoryChange(cat.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Recent Searches */}
      {!hasSearched && query.trim().length === 0 && recentSearches.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: currentTheme.muted }]}>
              {strings.search.recent}
            </Text>
            <Pressable onPress={handleClearRecents}>
              <Text style={[styles.clearRecentText, { color: currentTheme.brand }]}>
                {strings.search.clearRecent}
              </Text>
            </Pressable>
          </View>
          <View style={styles.recentChips}>
            {recentSearches.map((term, idx) => (
              <Chip key={idx} label={term} onPress={() => handleSelectRecent(term)} />
            ))}
          </View>
        </View>
      )}

      {/* Results List */}
      {hasSearched && results.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No results found"
          subtitle={strings.search.noResults}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item }) => {
            const snippet = getHighlightSnippet(item.ocr_text, query);
            return (
              <Pressable
                onPress={() => router.push(`/shot/${item.id}`)}
                style={({ pressed }) => [
                  styles.resultItem,
                  {
                    backgroundColor: currentTheme.card,
                    borderColor: currentTheme.line,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.resultThumb}>
                  <Thumb uri={item.uri} onPress={() => router.push(`/shot/${item.id}`)} />
                </View>
                <View style={styles.resultDetails}>
                  <Text style={[styles.resultCat, { color: currentTheme.brand }]}>
                    {item.primary_cat ? strings.folders[item.primary_cat] : 'Screenshot'}
                  </Text>
                  <Text style={[styles.resultSnippet, { color: currentTheme.ink }]} numberOfLines={3}>
                    {snippet || 'No text snippet available'}
                  </Text>
                  <Text style={[styles.resultDate, { color: currentTheme.muted }]}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing[4],
    marginBottom: theme.spacing[2],
    height: 48,
    borderRadius: theme.radius.base,
    borderWidth: 1,
    paddingHorizontal: theme.spacing[3],
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearBtn: {
    fontSize: 16,
    padding: 6,
  },
  filterBar: {
    paddingBottom: theme.spacing[3],
  },
  filterScroll: {
    paddingHorizontal: theme.spacing[4],
    gap: 8,
  },
  recentSection: {
    padding: theme.spacing[4],
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  clearRecentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultsList: {
    padding: theme.spacing[4],
    gap: 12,
  },
  resultItem: {
    flexDirection: 'row',
    borderRadius: theme.radius.base,
    borderWidth: 1,
    padding: theme.spacing[3],
    alignItems: 'center',
  },
  resultThumb: {
    width: 64,
    height: 64,
    marginRight: 12,
  },
  resultDetails: {
    flex: 1,
  },
  resultCat: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  resultSnippet: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  resultDate: {
    fontSize: 11,
  },
});
