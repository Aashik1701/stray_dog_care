import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const CACHE_KEY = 'dogs_cache_v1';
const STALE_MS = 60 * 1000; // 1 minute stale window

export function useDogs() {
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(0);
  const abortRef = useRef(null);

  const loadCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setDogs(parsed.dogs || []);
        setLastFetched(parsed.fetchedAt || 0);
      }
    } catch {}
  }, []);

  const saveCache = useCallback(async (list) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ dogs: list, fetchedAt: Date.now() }));
    } catch {}
  }, []);

  const fetchDogs = useCallback(async ({ force = false } = {}) => {
    if (!force && Date.now() - lastFetched < STALE_MS && dogs.length) {
      return; // fresh enough
    }
    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/dogs', { signal: controller.signal });
      const list = (res.data?.data?.dogs || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setDogs(list);
      setLastFetched(Date.now());
      saveCache(list);
    } catch (e) {
      if (e.name === 'CanceledError' || e.message === 'canceled') return;
      setError('Failed to load dogs');
    } finally {
      setLoading(false);
    }
  }, [dogs.length, lastFetched, saveCache]);

  const refresh = useCallback(async () => {
    await fetchDogs({ force: true });
  }, [fetchDogs]);

  useEffect(() => {
    loadCache().then(() => fetchDogs());
    return () => abortRef.current?.abort?.();
  }, [loadCache, fetchDogs]);

  return { dogs, loading, error, refresh, refetch: fetchDogs, lastFetched };
}
